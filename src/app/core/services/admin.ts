import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

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