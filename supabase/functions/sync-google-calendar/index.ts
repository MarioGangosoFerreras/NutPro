import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getAccessToken(nutricionistaId: string): Promise<string> {
  const { data, error } = await supabase
    .from('nutricionista_google_tokens')
    .select('refresh_token')
    .eq('nutricionista_id', nutricionistaId)
    .single()

  if (error || !data) throw new Error('No hay token de Google para este nutricionista')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('No se pudo refrescar el token')
  return json.access_token
}

async function buildGoogleEvent(cita: any) {
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('usuarios(email, nombre, apellidos)')
    .eq('id', cita.paciente_id)
    .single()

  const { data: nutricionista } = await supabase
    .from('nutricionistas')
    .select('usuarios(email, nombre, apellidos)')
    .eq('id', cita.nutricionista_id)
    .single()

  const inicio = new Date(cita.fecha_hora)
  const fin    = new Date(inicio.getTime() + cita.duracion_min * 60000)

  // Manejo de arrays/objetos dependiendo de cómo devuelva Supabase el join
  const pacienteData = Array.isArray(paciente?.usuarios) ? paciente.usuarios[0] : paciente?.usuarios;
  const nutriData = Array.isArray(nutricionista?.usuarios) ? nutricionista.usuarios[0] : nutricionista?.usuarios;

  const pacienteNombre = `${pacienteData?.nombre} ${pacienteData?.apellidos}`
  const nutriNombre    = `${nutriData?.nombre} ${nutriData?.apellidos}`

  return {
    summary:     `Cita · ${pacienteNombre}`,
    description: cita.notas || cita.motivo_solicitud || '',
    start: { dateTime: inicio.toISOString(), timeZone: 'Europe/Madrid' },
    end:   { dateTime: fin.toISOString(),    timeZone: 'Europe/Madrid' },
    attendees: [
      { email: pacienteData?.email, displayName: pacienteNombre },
      { email: nutriData?.email,    displayName: nutriNombre  },
    ],
    conferenceData: cita.tipo === 'videollamada' ? {
      createRequest: { requestId: cita.id, conferenceSolutionKey: { type: 'hangoutsMeet' } }
    } : undefined,
    location: cita.tipo === 'presencial' ? 'Consulta presencial' : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 1440 },
        { method: 'popup', minutes: 30  },
      ],
    },
    sendUpdates: 'all',
  }
}

serve(async (req) => {
  try {
    const { record, old_record, type } = await req.json()
    const cita = record || old_record
    
    if (!cita) {
      throw new Error('No se recibió ninguna cita en el payload del webhook')
    }

    const accessToken = await getAccessToken(cita.nutricionista_id)
    const calendarId  = 'primary'
    const headers     = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    }

    if (type === 'INSERT') {
      const event = await buildGoogleEvent(cita)
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
        { method: 'POST', headers, body: JSON.stringify(event) }
      )
      const created = await res.json()

      if (!res.ok) throw new Error(created.error?.message || 'Error al crear evento en Google')

      await supabase.from('citas')
        .update({ google_event_id: created.id, url_videollamada: created.hangoutLink ?? '' })
        .eq('id', cita.id)
    }

    if (type === 'UPDATE' && cita.google_event_id) {
      if (cita.estado === 'cancelada') {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${cita.google_event_id}?sendUpdates=all`,
          { method: 'DELETE', headers }
        )
      } else {
        const event = await buildGoogleEvent(cita)
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${cita.google_event_id}?conferenceDataVersion=1&sendUpdates=all`,
          { method: 'PUT', headers, body: JSON.stringify(event) }
        )
      }
    }

    if (type === 'DELETE' && old_record?.google_event_id) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${old_record.google_event_id}?sendUpdates=all`,
        { method: 'DELETE', headers }
      )
    }

    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err: any) { // <-- ¡Solución al error de tipado de Deno!
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})