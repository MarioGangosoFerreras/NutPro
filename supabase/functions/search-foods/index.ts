import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para extraer nutrientes de Open Food Facts (vienen por 100g)
function extraerNutrientesOFF(product: any) {
  const nuts = product.nutriments || {};
  return {
    calorias_kcal: nuts['energy-kcal_100g'] || nuts['energy-kcal'] || 0,
    proteina_g: nuts['proteins_100g'] || 0,
    carbohidratos_g: nuts['carbohydrates_100g'] || 0,
    grasa_g: nuts['fat_100g'] || 0,
    fibra_g: nuts['fiber_100g'] || 0,
    azucar_g: nuts['sugars_100g'] || 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const queryNormalizada = query.trim().toLowerCase();

    // 1. BUSCAR EN TU CACHÉ DE SUPABASE (Igual que antes)
    const { data: resultadosLocales } = await supabase
      .from('food_items')
      .select('*')
      .ilike('nombre', `%${queryNormalizada}%`)
      .eq('es_publico', true)
      .limit(20);

    // Si ya tenemos bastantes resultados locales, los devolvemos
    if (resultadosLocales && resultadosLocales.length >= 15) {
      return new Response(JSON.stringify({ data: resultadosLocales, fuente: 'cache' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. IR A OPEN FOOD FACTS (Sustituye a USDA + DeepL)
    // Filtramos por España y pedimos solo campos necesarios para ahorrar ancho de banda
    const urlOFF = new URL('https://es.openfoodfacts.org/cgi/search.pl');
    urlOFF.searchParams.set('search_terms', queryNormalizada);
    urlOFF.searchParams.set('search_simple', '1');
    urlOFF.searchParams.set('action', 'process');
    urlOFF.searchParams.set('json', '1');
    urlOFF.searchParams.set('page_size', '20');
    // Campos específicos para que la respuesta sea ligera
    urlOFF.searchParams.set('fields', 'code,product_name_es,product_name,brands,nutriments,image_front_small_url');

    const resOFF = await fetch(urlOFF.toString(), {
      headers: { 'User-Agent': 'MiAppNutricion - Web - Version 1.0' }
    });
    
    const dataOFF = await resOFF.json();
    const productos = dataOFF.products || [];

    // 3. MAPEAR PRODUCTOS A TU FORMATO
    const itemsParaUpsert = productos
      .filter((p: any) => p.product_name_es || p.product_name) // Asegurar que tiene nombre
      .map((p: any) => {
        const macros = extraerNutrientesOFF(p);
        return {
          nombre: p.product_name_es || p.product_name,
          fuente: 'off', // Cambiamos fuente a 'off' (Open Food Facts)
          external_id: String(p.code), // Usamos el código de barras como ID único
          categoria: p.brands || 'Genérico',
          es_publico: true,
          sincronizado_at: new Date().toISOString(),
          ...macros,
        };
      });

    // 4. UPSERT EN SUPABASE PARA CACHEAR
    let resultadoFinal = resultadosLocales || [];
    
    if (itemsParaUpsert.length > 0) {
      const { data: insertados, error: upsertError } = await supabase
        .from('food_items')
        .upsert(itemsParaUpsert, { onConflict: 'external_id' })
        .select();

      if (!upsertError && insertados) {
        // Combinar locales con nuevos (evitando duplicados por ID)
        const idsExistentes = new Set(resultadoFinal.map(r => r.id));
        const nuevos = insertados.filter(ins => !idsExistentes.has(ins.id));
        resultadoFinal = [...resultadoFinal, ...nuevos];
      }
    }

    return new Response(JSON.stringify({ data: resultadoFinal, fuente: 'openfoodfacts' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});