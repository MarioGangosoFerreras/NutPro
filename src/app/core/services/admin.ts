import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

/**
 * Servicio de administración para gestionar nutricionistas.
 * Proporciona métodos para consultar y actualizar el estado de nutricionistas.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  /**
   * Obtiene una lista de nutricionistas filtrados por su estado.
   * @param estado - El estado a filtrar ('pendiente', 'activo', 'rechazado' o 'inactivo')
   * @returns Promesa que resuelve con un array de nutricionistas o un array vacío en caso de error
   */
  async getNutricionistasPorEstado(estado: 'pendiente' | 'activo' | 'rechazado' | 'inactivo') {
    const { data, error } = await this.supabase
      .from('nutricionistas')
      .select(`
        id,
        numero_colegiado,
        especialidad,
        estado,
        usuario:usuario_id (
          nombre,
          apellidos,
          email,
          avatar_url
        )
      `)
      .eq('estado', estado)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error obteniendo nutricionistas:', error.message);
      return [];
    }

    return data;
  }

  /**
   * Cambia el estado de un nutricionista a 'activo' o 'rechazado'.
   * @param nutricionistaId - El identificador del nutricionista
   * @param estado - El nuevo estado ('activo' o 'rechazado')
   * @returns Promesa que resuelve a true si la operación fue exitosa, false en caso de error
   */
  async cambiarEstado(nutricionistaId: string, estado: 'activo' | 'rechazado') {
    const { error } = await this.supabase
      .from('nutricionistas')
      .update({ estado })
      .eq('id', nutricionistaId);

    if (error) {
      console.error('Error cambiando estado:', error.message);
      return false;
    }

    return true;
  }

  /**
   * Desactiva un nutricionista estableciendo su estado como 'inactivo'.
   * @param nutricionistaId - El identificador del nutricionista a desactivar
   * @returns Promesa que resuelve a true si la operación fue exitosa, false en caso de error
   */
  async desactivarNutricionista(nutricionistaId: string) {
    const { error } = await this.supabase
      .from('nutricionistas')
      .update({ estado: 'inactivo' })
      .eq('id', nutricionistaId);

    if (error) {
      console.error('Error desactivando nutricionista:', error.message);
      return false;
    }

    return true;
  }
}