import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  async getPacientes(nutricionistaId: string) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select(`
      id,
      email,
      telefono,
      fecha_nacimiento,
      sexo,
      motivo_consulta,
      created_at,
      usuario:usuario_id (
        nombre,
        apellidos
      )
    `)
      .eq('nutricionista_id', nutricionistaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo pacientes:', error.message);
      return [];
    }

    return data;
  }

  async crearPaciente(paciente: any) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .insert(paciente)
      .select()
      .single();

    if (error) {
      console.error('Error creando paciente:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  }

  async getPacienteById(id: string) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo paciente:', error.message);
      return null;
    }

    return data;
  }
}