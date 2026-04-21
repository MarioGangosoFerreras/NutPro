import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase';

export interface FoodItem {
  id: string;
  nombre: string;
  fuente: 'cache' | 'fatsecret' | 'manual' | 'custom' | 'cache_fallback' | 'off' | 'usda' | 'aesan';
  categoria?: string;
  es_publico: boolean;
  calorias_kcal: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasa_g: number;
  fibra_g: number;
  imagen_url?: string;
  micronutrientes?: Record<string, number>;
}

export interface IngredienteLocal extends FoodItem {
  food_item_id: string;
  cantidad_g: number;
  cantidad_texto?: string;
  es_opcional: boolean;
}

export interface SearchFoodsResponse {
  data: FoodItem[];
  fuente: 'cache' | 'fatsecret' | 'manual' | 'custom' | 'cache_fallback' | 'off' | 'usda' | 'aesan';
}

@Injectable({ providedIn: 'root' })
export class FoodService {
  private supabase = inject(SupabaseService).client;

  async buscarAlimentos(query: string): Promise<FoodItem[]> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    console.log('Token:', session?.access_token ? 'OK' : 'SIN TOKEN');
    console.log('URL:', `${environment.supabaseUrl}/functions/v1/search-foods`);

    const response = await fetch(`${environment.supabaseUrl}/functions/v1/search-foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
        apikey: environment.supabaseKey,
      },
      body: JSON.stringify({ query }),
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Respuesta:', result);

    if (!response.ok) throw new Error('Error buscando alimentos');
    return result.data ?? [];
  }

  async crearAlimentoCustom(alimento: Omit<FoodItem, 'id'>, usuarioId: string): Promise<FoodItem> {
    const { data, error } = await this.supabase
      .from('food_items')
      .insert({ ...alimento, fuente: 'custom', creado_por: usuarioId, es_publico: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async crearAlimentoManual(
    alimento: Omit<FoodItem, 'id' | 'fuente' | 'es_publico'>,
  ): Promise<FoodItem> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session) throw new Error('No hay sesión activa');

    const { data, error } = await this.supabase
      .from('food_items')
      .insert({
        ...alimento,
        fuente: 'manual',
        creado_por: session.user.id,
        es_publico: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
