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

  async crearPaciente(datos: any) {
    // Paso 1: Crear usuario sin auth_user_id
    const { data: usuario, error: errorUsuario } = await this.supabase
      .from('usuarios')
      .insert({
        email: datos.email,
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        rol: 'paciente'
      })
      .select()
      .single();

    if (errorUsuario) {
      console.error('Error creando usuario:', errorUsuario.message);
      return { data: null, error: errorUsuario };
    }

    // Paso 2: Crear paciente vinculado al usuario
    const { data: paciente, error: errorPaciente } = await this.supabase
      .from('pacientes')
      .insert({
        usuario_id: usuario.id,
        nutricionista_id: datos.nutricionista_id,
        dni: datos.dni,
        fecha_nacimiento: datos.fecha_nacimiento,
        sexo: datos.sexo,
        estado_civil: datos.estado_civil || null,
        telefono: datos.telefono,
        email: datos.email,
        direccion: datos.direccion,
        ocupacion: datos.ocupacion || null,
        nacionalidad: datos.nacionalidad || null,
        motivo_consulta: datos.motivo_consulta,
        alergias: datos.alergias,
        intolerancias: datos.intolerancias
      })
      .select()
      .single();

    if (errorPaciente) {
      console.error('Error creando paciente:', errorPaciente.message);
      // Si falla el paciente, borramos el usuario creado
      await this.supabase.from('usuarios').delete().eq('id', usuario.id);
      return { data: null, error: errorPaciente };
    }

    return { data: paciente, error: null };
  }

  async getPacienteById(id: string) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select(`
      *,
      usuario:usuario_id (
        nombre,
        apellidos,
        email,
        avatar_url
      ),
      nutricionista:nutricionista_id (
        id,
        especialidad,
        usuario:usuario_id (
          nombre,
          apellidos
        )
      )
    `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo paciente:', error.message);
      return null;
    }

    return data;
  }
}