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
  // Join con food_items para mostrar en UI
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
  descripcion?: string;
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
  // Join con ingredientes (opcional, solo cuando se carga el detalle)
  receta_ingredientes?: Ingrediente[];
}

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private supabase = inject(SupabaseService).client;

  // ─── Listar recetas (propias + públicas) ───────────────────────────────────
  async getRecetas(): Promise<Receta[]> {
    // 1. Comprobamos si hay sesión activa
    const { data: { session } } = await this.supabase.auth.getSession();
    console.log('Sesión activa:', session?.user?.email ?? 'SIN SESIÓN');

    const { data, error } = await this.supabase
      .from('recetas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error Supabase:', error.code, error.message, error.hint);
      throw error;
    }
    return data ?? [];
  }

  // ─── Receta por ID con sus ingredientes ────────────────────────────────────
  async getRecetaById(id: string): Promise<Receta> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select(`
        *,
        receta_ingredientes (
          *,
          food_items ( nombre, calorias_kcal, proteina_g, carbohidratos_g, grasa_g )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ─── Crear receta ──────────────────────────────────────────────────────────
  async crearReceta(receta: Omit<Receta, 'id' | 'calorias_kcal' | 'proteina_g' | 'carbohidratos_g' | 'grasa_g' | 'fibra_g'>): Promise<Receta> {
    const { data: { user } } = await this.supabase.auth.getUser();

    const { data, error } = await this.supabase
      .from('recetas')
      .insert({ ...receta, creado_por: user?.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ─── Añadir ingrediente (el trigger recalcula macros automáticamente) ───────
  async addIngrediente(ingrediente: Omit<Ingrediente, 'id'>): Promise<void> {
    const { error } = await this.supabase
      .from('receta_ingredientes')
      .insert(ingrediente);

    if (error) throw error;
  }

  // ─── Eliminar ingrediente ──────────────────────────────────────────────────
  async removeIngrediente(ingredienteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('receta_ingredientes')
      .delete()
      .eq('id', ingredienteId);

    if (error) throw error;
  }

  // ─── Eliminar receta ───────────────────────────────────────────────────────
  async eliminarReceta(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ─── Filtrar por tipo de comida ────────────────────────────────────────────
  async getRecetasPorTipo(tipo: string): Promise<Receta[]> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select('*')
      .contains('tipo_comida', [tipo])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}