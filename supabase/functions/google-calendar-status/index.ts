import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);
    if (userErr || !user)
      return new Response('Invalid Token', { status: 401, headers: corsHeaders });

    // 1. Buscamos al nutricionista de forma segura
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const { data: nutri } = await supabase
      .from('nutricionistas')
      .select('id')
      .eq('usuario_id', usuario?.id)
      .maybeSingle();

    if (!nutri)
      return new Response(JSON.stringify({ conectado: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    if (req.method === 'GET') {
      // 2. Comprobamos si el token existe de verdad
      const { data: tokenData } = await supabase
        .from('nutricionista_google_tokens')
        .select('nutricionista_id')
        .eq('nutricionista_id', nutri.id)
        .maybeSingle();
      return new Response(JSON.stringify({ conectado: !!tokenData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      await supabase.from('nutricionista_google_tokens').delete().eq('nutricionista_id', nutri.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
