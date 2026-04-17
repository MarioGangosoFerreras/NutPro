import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { data: result } = await supabase
      .from('nutricionistas')
      .select('id, nutricionista_google_tokens(nutricionista_id)')
      .eq('usuario_id',
        (await supabase.from('usuarios').select('id').eq('auth_user_id', user.id).single()).data?.id
      )
      .single();

    if (req.method === 'GET') {
      // CORRECCIÓN: Comprobamos si el array tiene algún elemento real
      const tokens = result?.nutricionista_google_tokens as any[];
      const conectado = Array.isArray(tokens) ? tokens.length > 0 : !!tokens;
      
      return new Response(JSON.stringify({ conectado }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'DELETE') {
      await supabase
        .from('nutricionista_google_tokens')
        .delete()
        .eq('nutricionista_id', result?.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});