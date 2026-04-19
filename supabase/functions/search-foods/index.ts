import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const USDA_API_KEY = Deno.env.get('USDA_API_KEY')!;
const GOOGLE_TRANSLATE_API_KEY = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function traducirAlIngles(texto: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texto, source: 'es', target: 'en', format: 'text' }),
  });
  const json = await res.json();
  return json.data?.translations?.[0]?.translatedText ?? texto;
}

async function traducirAlEspanol(textos: string[]): Promise<string[]> {
  if (textos.length === 0) return [];
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: textos, source: 'en', target: 'es', format: 'text' }),
  });
  const json = await res.json();
  return json.data?.translations?.map((t: any) => t.translatedText) ?? textos;
}

function limpiarNombreUSDA(nombre: string): string {
  return nombre.replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

function extraerNutrientes(foodNutrients: any[]) {
  const get = (id: number) => foodNutrients.find((n: any) => n.nutrientId === id)?.value ?? 0;
  return {
    calorias_kcal: get(1008),
    proteina_g: get(1003),
    carbohidratos_g: get(1005),
    grasa_g: get(1004),
    fibra_g: get(1079),
    azucar_g: get(2000),
  };
}

async function buscarEnUSDA(queryEnIngles: string): Promise<any[]> {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('api_key', USDA_API_KEY);
  url.searchParams.set('query', queryEnIngles);
  url.searchParams.set('dataType', 'Foundation,SR Legacy');
  url.searchParams.set('pageSize', '15');

  console.log('URL USDA:', url.toString());
  const res = await fetch(url.toString());
  console.log('Status USDA:', res.status);

  if (!res.ok) {
    console.error('Error USDA:', await res.text());
    return [];
  }

  const json = await res.json();
  console.log('Total resultados USDA:', json.totalHits ?? 0);
  return json.foods ?? [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log('Query recibida:', query);

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    });
    const queryNormalizada = query.trim().toLowerCase();

    // ── 1. Buscar en caché local ──────────────────────────────────────────────
    const { data: resultadosLocales, error: errorLocal } = await supabase
      .from('food_items')
      .select('*')
      .ilike('nombre', `%${queryNormalizada}%`)
      .eq('es_publico', true)
      .limit(20);

    console.log('Resultados locales:', resultadosLocales?.length ?? 0);
    console.log('Error local:', JSON.stringify(errorLocal));

    if (resultadosLocales && resultadosLocales.length >= 5) {
      return new Response(JSON.stringify({ data: resultadosLocales, fuente: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Ir a USDA ──────────────────────────────────────────────────────────
    const queryEnIngles = await traducirAlIngles(query.trim());
    console.log('Query traducida:', queryEnIngles);

    const alimentosUSDA = await buscarEnUSDA(queryEnIngles);

    if (alimentosUSDA.length === 0) {
      return new Response(JSON.stringify({ data: resultadosLocales ?? [], fuente: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Traducir nombres EN → ES ───────────────────────────────────────────
    const nombresEnIngles = alimentosUSDA.map((f) => limpiarNombreUSDA(f.description));
    const nombresEnEspanol = await traducirAlEspanol(nombresEnIngles);

    // ── 4. Construir items para upsert ────────────────────────────────────────
    const itemsParaUpsert = alimentosUSDA.map((food, i) => {
      const macros = extraerNutrientes(food.foodNutrients ?? []);
      return {
        nombre: nombresEnEspanol[i] ?? limpiarNombreUSDA(food.description),
        fuente: 'usda',
        external_id: String(food.fdcId),
        categoria: food.foodCategory ?? null,
        es_publico: true,
        sincronizado_at: new Date().toISOString(),
        ...macros,
      };
    });

    // ── 5. Test SELECT e INSERT para diagnóstico ──────────────────────────────
    const { data: selectTest, error: selectError } = await supabase
      .from('food_items')
      .select('id')
      .limit(1);
    console.log('TEST SELECT:', JSON.stringify(selectTest), JSON.stringify(selectError));

    const { data: insertTest, error: insertError } = await supabase
      .from('food_items')
      .insert({
        nombre: 'test_' + Date.now(),
        fuente: 'usda',
        es_publico: true,
        calorias_kcal: 0,
        proteina_g: 0,
        carbohidratos_g: 0,
        grasa_g: 0,
        fibra_g: 0,
        azucar_g: 0,
      })
      .select();
    console.log('TEST INSERT:', JSON.stringify(insertTest), JSON.stringify(insertError));

    // ── 6. Upsert real ────────────────────────────────────────────────────────
    const { data: insertados, error: upsertError } = await supabase
      .from('food_items')
      .upsert(itemsParaUpsert, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('Error en upsert:', upsertError);
      return new Response(
        JSON.stringify({ data: resultadosLocales ?? [], fuente: 'cache_fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 7. Combinar y devolver ────────────────────────────────────────────────
    const idsLocales = new Set((resultadosLocales ?? []).map((r: any) => r.id));
    const nuevos = (insertados ?? []).filter((item: any) => !idsLocales.has(item.id));
    const resultadoFinal = [...(resultadosLocales ?? []), ...nuevos];

    return new Response(JSON.stringify({ data: resultadoFinal, fuente: 'usda' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('CRASH:', err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
