import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

/**
 * Representa un ingrediente en una receta.
 * @interface
 */
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

/**
 * Representa una receta.
 * @interface
 */
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

/**
 * Servicio para gestionar recetas y sus ingredientes utilizando Supabase.
 * @class
 */
@Injectable({ providedIn: 'root' })
export class RecetaService {
  private supabase = inject(SupabaseService).client;

  /**
   * Obtiene todas las recetas ordenadas por fecha de creación descendente.
   * @returns {Promise<Receta[]>} Una promesa que resuelve a un arreglo de recetas.
   */
  async getRecetas(): Promise<Receta[]> {
    const { data, error } = await this.supabase
      .from('recetas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Obtiene una receta por su identificador, incluyendo sus ingredientes y alimentos asociados.
   * @param {string} id - El identificador de la receta.
   * @returns {Promise<Receta>} Una promesa que resuelve a la receta encontrada.
   */
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
    return data as Receta;
  }

  /**
   * Crea una nueva receta en la base de datos.
   * @param {Omit<Receta, 'id' | 'calorias_kcal' | 'proteina_g' | 'carbohidratos_g' | 'grasa_g' | 'fibra_g'>} receta - Los datos de la receta a crear.
   * @returns {Promise<Receta>} Una promesa que resuelve a la receta creada.
   */
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

  /**
   * Actualiza una receta existente.
   * @param {string} id - El identificador de la receta a actualizar.
   * @param {Partial<Receta>} receta - Los campos a actualizar.
   * @returns {Promise<Receta>} Una promesa que resuelve a la receta actualizada.
   */
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

  /**
   * Elimina todos los ingredientes de una receta.
   * @param {string} recetaId - El identificador de la receta.
   * @returns {Promise<void>} Una promesa que se resuelve cuando se eliminan los ingredientes.
   */
  async eliminarIngredientesDeReceta(recetaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('receta_ingredientes')
      .delete()
      .eq('receta_id', recetaId);
    if (error) throw error;
  }

  /**
   * Agrega un nuevo ingrediente a una receta.
   * @param {Omit<Ingrediente, 'id'>} ingrediente - Los datos del ingrediente a agregar.
   * @returns {Promise<void>} Una promesa que se resuelve cuando se agrega el ingrediente.
   */
  async addIngrediente(ingrediente: Omit<Ingrediente, 'id'>): Promise<void> {
    const { error } = await this.supabase.from('receta_ingredientes').insert(ingrediente);
    if (error) throw error;
  }

  /**
   * Elimina una receta por su identificador.
   * @param {string} id - El identificador de la receta a eliminar.
   * @returns {Promise<void>} Una promesa que se resuelve cuando se elimina la receta.
   */
  async eliminarReceta(id: string): Promise<void> {
    const { error } = await this.supabase.from('recetas').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Obtiene los identificadores de las recetas ocultas por un usuario.
   * @param {string} usuarioId - El identificador del usuario.
   * @returns {Promise<string[]>} Una promesa que resuelve a un arreglo de identificadores de recetas ocultas.
   */
  async getIdsRecetasOcultas(usuarioId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('recetas_ocultas')
      .select('receta_id')
      .eq('usuario_id', usuarioId);
    if (error) return [];
    return data.map((d) => d.receta_id);
  }

  /**
   * Oculta una receta para un usuario específico.
   * @param {string} recetaId - El identificador de la receta a ocultar.
   * @param {string} usuarioId - El identificador del usuario.
   * @returns {Promise<void>} Una promesa que se resuelve cuando se oculta la receta.
   */
  async ocultarReceta(recetaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas_ocultas')
      .insert({ receta_id: recetaId, usuario_id: usuarioId });
    if (error) throw error;
  }

  /**
   * Desoculta una receta para un usuario específico.
   * @param {string} recetaId - El identificador de la receta a desocultar.
   * @param {string} usuarioId - El identificador del usuario.
   * @returns {Promise<void>} Una promesa que se resuelve cuando se desoculta la receta.
   */
  async desocultarReceta(recetaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recetas_ocultas')
      .delete()
      .eq('receta_id', recetaId)
      .eq('usuario_id', usuarioId);
    if (error) throw error;
  }
}
