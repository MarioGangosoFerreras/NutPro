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
    const { code } = await req.json();

    // FORZAMOS LAS URLS PARA QUE NO HAYA DUDA DE A QUÉ BASE DE DATOS VA
    const supabaseUrl = 'https://nzttjhlwrudepimqmxeg.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const NUTRI_ID_REAL = 'd8bc069d-10aa-464e-8778-3fb85cf98327';

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI')!,
        grant_type: 'authorization_code',
      }),
    });

    const googleData = await res.json();

    // USAMOS .upsert() pero con una configuración que fuerza la escritura inmediata
    const { data, error: dbErr } = await supabase
      .from('nutricionista_google_tokens')
      .upsert(
        {
          nutricionista_id: NUTRI_ID_REAL,
          access_token: googleData.access_token,
          refresh_token: googleData.refresh_token,
          expires_at: new Date(Date.now() + googleData.expires_in * 1000).toISOString(),
        },
        { onConflict: 'nutricionista_id' },
      )
      .select();

    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ ok: true, data_en_db: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
