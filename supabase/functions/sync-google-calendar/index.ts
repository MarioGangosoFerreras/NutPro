import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = 'https://nzttjhlwrudepimqmxeg.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const cita = payload.record || payload.old_record;
    if (!cita) throw new Error('Sin datos de cita');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Obtener Token
    const { data: tokenData } = await supabase
      .from('nutricionista_google_tokens')
      .select('refresh_token')
      .eq('nutricionista_id', cita.nutricionista_id)
      .single();

    if (!tokenData) throw new Error('No hay token para este nutricionista');

    // 2. Refrescar Access Token
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const { access_token } = await refreshRes.json();

    if (payload.type === 'INSERT') {
      // 3. Obtener datos extra (Paciente)
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('usuarios(email, nombre, apellidos)')
        .eq('id', cita.paciente_id)
        .single();
      const pData = Array.isArray(paciente?.usuarios) ? paciente.usuarios[0] : paciente?.usuarios;

      // 4. Crear evento en Google
      const inicio = new Date(cita.fecha_hora);
      const fin = new Date(inicio.getTime() + (cita.duracion_min || 60) * 60000);

      const event = {
        summary: `Cita: ${pData?.nombre || 'Paciente'}`,
        description: cita.notas || '',
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fin.toISOString() },
        attendees: pData?.email ? [{ email: pData.email }] : [],
      };

      const gRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      const created = await gRes.json();
      if (!gRes.ok) throw new Error(`Google Error: ${created.error?.message}`);

      // 5. Guardar ID de Google en nuestra tabla
      await supabase.from('citas').update({ google_event_id: created.id }).eq('id', cita.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ Fallo en Sincronización:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
