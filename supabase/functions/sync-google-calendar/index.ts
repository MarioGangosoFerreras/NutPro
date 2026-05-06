import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = 'https://nzttjhlwrudepimqmxeg.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const type = payload.type;
    const cita = payload.record || payload.old_record;

    if (!cita) throw new Error('Sin datos de cita');

    console.log(`[SYNC] Iniciando sincronización para cita ${cita.id} (Tipo: ${type})`);

    // --- 1. EVITAR BUCLE INFINITO ---
    if (
      type === 'UPDATE' &&
      payload.old_record?.google_event_id !== payload.record?.google_event_id &&
      Object.keys(payload.record).length <= 4
    ) {
      console.log('[SYNC] Ignorado para evitar bucles (solo se actualizó el google_event_id)');
      return new Response(JSON.stringify({ ok: true, msg: 'Ignorado para evitar bucles' }));
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // --- 2. OBTENER TOKEN DEL NUTRICIONISTA ---
    const { data: tokenData, error: tokenErr } = await supabase
      .from('nutricionista_google_tokens')
      .select('refresh_token')
      .eq('nutricionista_id', cita.nutricionista_id)
      .single();

    if (tokenErr || !tokenData) {
      console.log('[SYNC] No hay token para este nutricionista. Abortando.');
      return new Response(JSON.stringify({ ok: true, msg: 'Sincronización desactivada' }));
    }

    // --- 3. REFRESCAR ACCESS TOKEN ---
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokenJson = await refreshRes.json();
    const access_token = tokenJson.access_token;

    const googleEventId = cita.id.replaceAll('-', '');

    // --- 4. MANEJO DE ELIMINACIÓN (DELETE) ---
    if (type === 'DELETE') {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );
      console.log(`[SYNC] Cita ${googleEventId} eliminada de Google Calendar`);
      return new Response(JSON.stringify({ ok: true }));
    }

    // --- 5. OBTENER DATOS DEL PACIENTE (IGUAL QUE EN ANGULAR) ---
    console.log(`[SYNC] Buscando datos del paciente con ID: ${cita.paciente_id}`);

    const { data: pacienteData, error: pacError } = await supabase
      .from('pacientes')
      .select(
        `
        telefono,
        usuario:usuario_id (
          nombre,
          apellidos,
          email
        )
      `,
      )
      .eq('id', cita.paciente_id)
      .single();

    if (pacError) {
      console.error('[SYNC] Error al consultar la tabla pacientes:', pacError.message);
    }

    console.log('[SYNC] Datos crudos devueltos por la BD:', pacienteData);

    // Supabase a veces devuelve un array en los Joins, lo controlamos por si acaso:
    const u = Array.isArray(pacienteData?.usuario)
      ? pacienteData?.usuario[0]
      : pacienteData?.usuario;

    // Controlamos si la columna se llama "apellidos" (Angular) o "apellido" (tu mensaje anterior)
    const nombre = u?.nombre || '';
    const apellidos = u?.apellidos || u?.apellido || '';
    const nombreCompleto = `${nombre} ${apellidos}`.trim() || 'Paciente';

    console.log(`[SYNC] Nombre final a mostrar: "${nombreCompleto}"`);

    // --- 6. DURACIÓN Y HORARIOS ---
    const duracionMinutos = Number(cita.duracion_min) || 60;
    const inicio = new Date(cita.fecha_hora);
    const fin = new Date(inicio.getTime() + duracionMinutos * 60000);

    const tituloCita =
      cita.estado === 'cancelada' ? `🚫 CANCELADA: ${nombreCompleto}` : `Cita: ${nombreCompleto}`;

    const eventBody = {
      id: googleEventId,
      summary: tituloCita,
      location:
        cita.tipo === 'videollamada'
          ? cita.url_videollamada || 'Videollamada Online'
          : 'Consulta Presencial',
      description: `
👤 PACIENTE: ${nombreCompleto}
📧 CORREO: ${u?.email || 'No disponible'}
📞 TELÉFONO: ${pacienteData?.telefono || 'No disponible'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ESTADO: ${cita.estado.toUpperCase()}
📝 NOTAS: ${cita.notas || 'Sin observaciones.'}
${cita.tipo === 'videollamada' ? `\n🎥 ENLACE VIDEOLLAMADA:\n${cita.url_videollamada || 'Se adjuntará pronto'}` : '\n🏢 TIPO: Consulta Presencial'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generado automáticamente por NutPro.
      `.trim(),
      start: { dateTime: inicio.toISOString() },
      end: { dateTime: fin.toISOString() },
      attendees: u?.email ? [{ email: u.email }] : [],
    };

    // --- 7. SINCRONIZACIÓN CON GOOGLE ---
    let gRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });

    if (gRes.status === 409) {
      console.log('[SYNC] El evento ya existe en Google (409), actualizando con PATCH...');
      gRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        },
      );
    }

    if (gRes.ok && !cita.google_event_id) {
      await supabase.from('citas').update({ google_event_id: googleEventId }).eq('id', cita.id);
      console.log('[SYNC] Cita creada y ID guardado en base de datos correctamente');
    }

    return new Response(JSON.stringify({ ok: true }));
  } catch (err: any) {
    console.error('❌ Error general Sincronización:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
