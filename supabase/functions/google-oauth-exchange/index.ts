import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const code = body.code;

    if (!code) return new Response(JSON.stringify({ error: 'Falta el code de Google' }), { status: 400, headers: corsHeaders });

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Fallo de auth en Supabase' }), { status: 401, headers: corsHeaders });

    // 1. Buscar usuario
    const { data: usuario, error: usuErr } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (usuErr || !usuario) return new Response(JSON.stringify({ error: `Usuario no encontrado. ${usuErr?.message}` }), { status: 404, headers: corsHeaders });

    // 2. Buscar nutricionista
    const { data: nutricionista, error: nutErr } = await supabase
      .from('nutricionistas')
      .select('id')
      .eq('usuario_id', usuario.id)
      .maybeSingle();

    if (nutErr || !nutricionista) return new Response(JSON.stringify({ error: `Nutricionista no encontrado. ${nutErr?.message}` }), { status: 404, headers: corsHeaders });

    // 3. Comprobar que los secrets de Google están en Supabase
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
       return new Response(JSON.stringify({ error: 'Faltan los SECRETS de Google en Supabase' }), { status: 500, headers: corsHeaders });
    }

    // 4. Intercambiar tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      return new Response(JSON.stringify({ error: `Fallo en el intercambio de Google: ${err}` }), { status: 400, headers: corsHeaders });
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // 5. Guardar tokens en la base de datos
    const { error: upsertError } = await supabase
      .from('nutricionista_google_tokens')
      .upsert({
        nutricionista_id: nutricionista.id,
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      }, { onConflict: 'nutricionista_id' });

    if (upsertError) return new Response(JSON.stringify({ error: `Error en BBDD guardando tokens: ${upsertError.message}` }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Error inesperado: ${err.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});