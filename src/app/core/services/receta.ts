import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Ingrediente {
  id?: string;
  receta_id?: string;
  imagen_url?: string;
  food_item_id: string;
  cantidad_g: number;
  cantidad_texto?: string;
  es_opcional?: boolean;
  orden?: number;
  food_items?: {
    nombre: string;
    calorias_kcal: number;
    proteina_g: number;
    carbohidratos_g: number;
    grasa_g: number;
  };
}

export interface Receta {
  id: string;
  creado_por?: string;
  nombre: string;
  visibilidad: 'publica' | 'privada';
  tipo_comida?: string[];
  etiquetas?: string[];
  raciones: number;
  tiempo_prep_min?: number;
  instrucciones?: string;
  imagen_url?: string;
  calorias_kcal: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasa_g: number;
  fibra_g: number;
  created_at?: string;
  receta_ingredientes?: Ingrediente[];
}

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private supabase = inject(SupabaseService).client;

  async getRecetas(): Promise<Receta[]> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // Corregido con "as Receta" para evitar errores de tipado
  async getRecetaById(id: string): Promise<Receta> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select(
        `
        *,
        receta_ingredientes (
          *,
          food_items ( nombre, calorias_kcal, proteina_g, carbohidratos_g, grasa_g )
        )
      `,
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Receta; // Esto evita el error de compilación en el detalle
  }

  async crearReceta(
    receta: Omit<
      Receta,
      'id' | 'calorias_kcal' | 'proteina_g' | 'carbohidratos_g' | 'grasa_g' | 'fibra_g'
    >,
  ): Promise<Receta> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    const { data, error } = await this.supabase
      .from('recetas')
      .insert({ ...receta, creado_por: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as Receta;
  }

  async actualizarReceta(id: string, receta: Partial<Receta>): Promise<Receta> {
    const { data, error } = await this.supabase
      .from('recetas')
      .update(receta)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Receta;
  }

  async eliminarIngredientesDeReceta(recetaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('receta_ingredientes')
      .delete()
      .eq('receta_id', recetaId);
    if (error) throw error;
  }

  async addIngrediente(ingrediente: Omit<Ingrediente, 'id'>): Promise<void> {
    const { error } = await this.supabase.from('receta_ingredientes').insert(ingrediente);
    if (error) throw error;
  }

  async eliminarReceta(id: string): Promise<void> {
    const { error } = await this.supabase.from('recetas').delete().eq('id', id);
    if (error) throw error;
  }

  // Métodos para la gestión de recetas ocultas
  async getIdsRecetasOcultas(usuarioId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('recetas_ocultas')
      .select('receta_id')
      .eq('usuario_id', usuarioId);
    if (error) return [];
    return data.map((d) => d.receta_id);
  }

  async ocultarReceta(recetaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas_ocultas')
      .insert({ receta_id: recetaId, usuario_id: usuarioId });
    if (error) throw error;
  }

  async desocultarReceta(recetaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas_ocultas')
      .delete()
      .eq('receta_id', recetaId)
      .eq('usuario_id', usuarioId);
    if (error) throw error;
  }
}
