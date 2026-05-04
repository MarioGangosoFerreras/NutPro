import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase';

/**
 * Interfaz que representa un elemento de alimento con información nutricional.
 * @interface FoodItem
 * @property {string} id - Identificador único del alimento
 * @property {string} nombre - Nombre del alimento
 * @property {'cache' | 'fatsecret' | 'manual' | 'custom' | 'cache_fallback' | 'off' | 'usda' | 'aesan'} fuente - Fuente de donde proviene la información del alimento
 * @property {string} [categoria] - Categoría del alimento (opcional)
 * @property {boolean} es_publico - Indica si el alimento es público
 * @property {number} calorias_kcal - Calorías en kilocalorías
 * @property {number} proteina_g - Proteína en gramos
 * @property {number} carbohidratos_g - Carbohidratos en gramos
 * @property {number} grasa_g - Grasa en gramos
 * @property {number} fibra_g - Fibra en gramos
 * @property {string} [imagen_url] - URL de la imagen del alimento (opcional)
 * @property {Record<string, number>} [micronutrientes] - Registro de micronutrientes (opcional)
 */
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

/**
 * Interfaz que representa un ingrediente local, extendiendo FoodItem.
 * @interface IngredienteLocal
 * @extends {FoodItem}
 * @property {string} food_item_id - Identificador del elemento de alimento asociado
 * @property {number} cantidad_g - Cantidad en gramos del ingrediente
 * @property {string} [cantidad_texto] - Representación en texto de la cantidad (opcional)
 * @property {boolean} es_opcional - Indica si el ingrediente es opcional en una receta
 */
export interface IngredienteLocal extends FoodItem {
  food_item_id: string;
  cantidad_g: number;
  cantidad_texto?: string;
  es_opcional: boolean;
}

/**
 * Interfaz que representa la respuesta de una búsqueda de alimentos.
 * @interface SearchFoodsResponse
 * @property {FoodItem[]} data - Array de elementos de alimento encontrados
 * @property {'cache' | 'fatsecret' | 'manual' | 'custom' | 'cache_fallback' | 'off' | 'usda' | 'aesan'} fuente - Fuente de donde proviene la información de los alimentos
 */
export interface SearchFoodsResponse {
  data: FoodItem[];
  fuente: 'cache' | 'fatsecret' | 'manual' | 'custom' | 'cache_fallback' | 'off' | 'usda' | 'aesan';
}

@Injectable({ providedIn: 'root' })
export class FoodService {
  private supabase = inject(SupabaseService).client;

  /**
   * Busca alimentos basándose en una consulta de texto.
   * @param query - Término de búsqueda para los alimentos
   * @returns Promesa que resuelve a un array de elementos de alimento encontrados
   * @throws Error si la solicitud falla
   */
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

  /**
   * Crea un alimento personalizado en la base de datos.
   * @param alimento - Objeto con los datos del alimento sin el ID
   * @param usuarioId - ID del usuario que crea el alimento
   * @returns Promesa que resuelve al alimento creado con su ID asignado
   * @throws Error si la inserción falla
   */
  async crearAlimentoCustom(alimento: Omit<FoodItem, 'id'>, usuarioId: string): Promise<FoodItem> {
    const { data, error } = await this.supabase
      .from('food_items')
      .insert({ ...alimento, fuente: 'custom', creado_por: usuarioId, es_publico: false })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Crea un alimento manual en la base de datos para el usuario autenticado.
   * @param alimento - Objeto con los datos del alimento sin ID, fuente ni visibilidad
   * @returns Promesa que resuelve al alimento creado con su ID asignado
   * @throws Error si no hay sesión activa o la inserción falla
   */
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
