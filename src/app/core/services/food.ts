import { Injectable, inject } from '@angular/core';// ajusta el path a tu proyecto
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase';

export interface FoodItem {
  id: string;
  nombre: string;
  fuente: 'usda' | 'custom' | 'manual';
  external_id?: string;
  categoria?: string;
  es_publico: boolean;
  calorias_kcal: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasa_g: number;
  fibra_g: number;
  azucar_g: number;
  micronutrientes?: Record<string, number>;
}

export interface SearchFoodsResponse {
  data: FoodItem[];
  fuente: 'cache' | 'usda' | 'cache_fallback';
}

@Injectable({ providedIn: 'root' })
export class FoodService {
  private supabase = inject(SupabaseService).client;

  async buscarAlimentos(query: string): Promise<FoodItem[]> {
  const { data: { session } } = await this.supabase.auth.getSession();
  console.log('Token:', session?.access_token ? 'OK' : 'SIN TOKEN');
  console.log('URL:', `${environment.supabaseUrl}/functions/v1/search-foods`);

  const response = await fetch(
    `${environment.supabaseUrl}/functions/v1/search-foods`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': environment.supabaseKey,
      },
      body: JSON.stringify({ query }),
    }
  );

  console.log('Status:', response.status);
  const result = await response.json();
  console.log('Respuesta:', result);

  if (!response.ok) throw new Error('Error buscando alimentos');
  return result.data ?? [];
}

  // Útil para cuando el usuario quiere crear un alimento propio
  async crearAlimentoCustom(
    alimento: Omit<FoodItem, 'id'>,
    usuarioId: string
  ): Promise<FoodItem> {
    const { data, error } = await this.supabase
      .from('food_items')
      .insert({ ...alimento, fuente: 'custom', creado_por: usuarioId, es_publico: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}