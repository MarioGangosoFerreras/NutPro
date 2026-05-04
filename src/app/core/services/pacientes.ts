import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

/**
 * Servicio de gestión de pacientes
 * @description Proporciona métodos para consultar, crear, actualizar y eliminar pacientes
 * desde la base de datos de Supabase. Gestiona también la carga de avatares en Cloudinary
 * y el perfil del paciente logueado.
 */
@Injectable({
  providedIn: 'root',
})
export class PacientesService {
  private supabase: SupabaseClient;

  /**
   * Constructor del servicio
   * @param {SupabaseService} supabaseService - Servicio de Supabase inyectado
   */
  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  /**
   * Obtiene el cliente de Supabase
   * @returns {SupabaseClient} Cliente de Supabase
   */
  get supabaseClient() {
    return this.supabase;
  }

  /**
   * Obtiene la lista de pacientes de un nutricionista
   * @async
   * @param {string} nutricionistaId - ID del nutricionista
   * @returns {Promise<any[]>} Array de pacientes con datos del usuario relacionado, ordenados por fecha de creación descendente
   * @example
   * const pacientes = await pacientesService.getPacientes('nutricionista-123');
   */
  async getPacientes(nutricionistaId: string) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select(
        `
      id,
      email,
      telefono,
      fecha_nacimiento,
      sexo,
      motivo_consulta,
      created_at,
      usuario:usuario_id (
        nombre,
        apellidos,
        avatar_url
      )
    `,
      )
      .eq('nutricionista_id', nutricionistaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo pacientes:', error.message);
      return [];
    }

    return data;
  }

  /**
   * Crea un nuevo paciente junto con su usuario asociado
   * @async
   * @param {any} datos - Objeto con los datos del paciente (nombre, apellidos, email, dni, fecha_nacimiento, sexo, etc.)
   * @param {File | null} [avatarFile] - Archivo de imagen del avatar a subir a Cloudinary (opcional)
   * @returns {Promise<{data: any | null, error: any}>} Objeto con los datos del paciente creado o error
   * @throws {Error} Si hay error al crear el usuario o el paciente
   */
  async crearPaciente(datos: any, avatarFile?: File | null) {
    let avatarUrl = null;

    try {
      // PASO 0: Subir a Cloudinary si hay archivo
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('upload_preset', 'nutpro_avatars'); // <--- USA TU PRESET (el que uses en editar)
        formData.append('folder', 'nutpro/avatars');

        const res = await fetch('https://api.cloudinary.com/v1_1/dsvp0hgvd/image/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const cloudData = await res.json();
          avatarUrl = cloudData.secure_url;
          console.log('Imagen subida a Cloudinary con éxito:', avatarUrl);
        } else {
          console.error('Error en Cloudinary:', await res.text());
        }
      }

      // Paso 1: Crear usuario con la URL de Cloudinary
      const { data: usuario, error: errorUsuario } = await this.supabase
        .from('usuarios')
        .insert({
          email: datos.email,
          nombre: datos.nombre,
          apellidos: datos.apellidos,
          rol: 'paciente',
          avatar_url: avatarUrl, // Aquí guardamos la URL de Cloudinary
        })
        .select()
        .single();

      if (errorUsuario) throw errorUsuario;

      // Paso 2: Crear paciente vinculado
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
          intolerancias: datos.intolerancias,
        })
        .select()
        .single();

      if (errorPaciente) {
        await this.supabase.from('usuarios').delete().eq('id', usuario.id);
        throw errorPaciente;
      }

      return { data: paciente, error: null };
    } catch (err: any) {
      console.error('Error en el proceso:', err.message);
      return { data: null, error: err };
    }
  }

  /**
   * Obtiene los detalles completos de un paciente por su ID
   * @async
   * @param {string} id - ID del paciente
   * @returns {Promise<any | null>} Objeto del paciente con datos del usuario y nutricionista relacionados, o null si hay error
   */
  async getPacienteById(id: string) {
    const { data, error } = await this.supabase
      .from('pacientes')
      .select(
        `
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
          apellidos,
          avatar_url
        )
      )
    `,
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo paciente:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Actualiza los datos de un paciente existente
   * @async
   * @param {string} id - ID del paciente a actualizar
   * @param {any} datos - Objeto con los datos a actualizar (nombre, apellidos, email, teléfono, dirección, etc.)
   * @returns {Promise<void>}
   * @throws {Error} Si hay error al actualizar el usuario o el paciente
   */
  async actualizarPaciente(id: string, datos: any) {
    const {
      nombre,
      apellidos,
      avatar_url,
      email,
      telefono,
      direccion,
      fecha_nacimiento,
      sexo,
      dni,
      ocupacion,
      estado_civil,
      nacionalidad,
      motivo_consulta,
    } = datos;

    // Primero obtenemos el usuario_id del paciente
    const { data: paciente, error: errorGet } = await this.supabase
      .from('pacientes')
      .select('usuario_id')
      .eq('id', id)
      .single();

    if (errorGet) throw errorGet;

    // Actualizar tabla usuarios
    const { error: errorUsuario } = await this.supabase
      .from('usuarios')
      .update({ nombre, apellidos, avatar_url })
      .eq('id', paciente.usuario_id);

    if (errorUsuario) throw errorUsuario;

    // Actualizar tabla pacientes
    const { error: errorPaciente } = await this.supabase
      .from('pacientes')
      .update({
        email,
        telefono,
        direccion,
        fecha_nacimiento,
        sexo,
        dni,
        ocupacion,
        estado_civil,
        nacionalidad,
        motivo_consulta,
        alergias: datos.alergias,
        intolerancias: datos.intolerancias,
      })
      .eq('id', id);

    if (errorPaciente) throw errorPaciente;
  }

  /**
   * Elimina un paciente y su usuario asociado
   * @async
   * @param {string} id - ID del paciente a eliminar
   * @param {string} usuarioId - ID del usuario asociado al paciente
   * @returns {Promise<void>}
   * @throws {Error} Si hay error al eliminar el usuario
   */
  async eliminarPaciente(id: string, usuarioId: string) {
    // Al borrar usuario, paciente se borra en cascada
    const { error } = await this.supabase.from('usuarios').delete().eq('id', usuarioId);

    if (error) throw error;
  }

  /**
   * Obtiene una vista previa de pacientes con sus próximas citas ordenadas por fecha
   * @async
   * @param {string} nutricionistaId - ID del nutricionista
   * @param {number} [limite=5] - Número máximo de pacientes a retornar
   * @returns {Promise<any[]>} Array de pacientes con su próxima cita, ordenados por fecha de cita ascendente
   */
  async getPacientesPreview(nutricionistaId: string, limite: number = 5) {
    // 1. Filtramos desde el inicio de hoy para que las citas que ya pasaron
    // hoy sigan apareciendo en la lista hasta que acabe el día.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const filtroFecha = hoy.toISOString();

    const { data, error } = await this.supabase
      .from('pacientes')
      .select(
        `
      id,
      usuario:usuario_id (nombre, apellidos, avatar_url),
      citas (id, fecha_hora, tipo, estado, nutricionista_id)
    `,
      )
      .eq('nutricionista_id', nutricionistaId)
      // Traemos un poco más del límite para poder ordenar bien en memoria
      .limit(50);

    if (error) {
      console.error('Error:', error.message);
      return [];
    }

    // 2. Procesamos en el cliente para evitar los fallos de los "Inner Filters" de Supabase
    const pacientesProcesados = (data ?? []).map((p: any) => {
      const citasFuturas = (p.citas || [])
        .filter(
          (c: any) =>
            c.nutricionista_id === nutricionistaId &&
            c.estado !== 'cancelada' &&
            c.fecha_hora >= filtroFecha,
        )
        .sort(
          (a: any, b: any) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        );

      return { ...p, proximaCita: citasFuturas[0] || null };
    });

    // 3. ORDENACIÓN: Citas más próximas arriba, pacientes sin cita abajo
    return pacientesProcesados
      .sort((a, b) => {
        if (a.proximaCita && b.proximaCita) {
          return (
            new Date(a.proximaCita.fecha_hora).getTime() -
            new Date(b.proximaCita.fecha_hora).getTime()
          );
        }
        if (a.proximaCita && !b.proximaCita) return -1;
        if (!a.proximaCita && b.proximaCita) return 1;
        return 0;
      })
      .slice(0, limite); // Aplicamos el límite visual final
  }

  /**
   * Desuscribe y limpia un canal de Supabase para dejar de escuchar cambios en citas
   * @async
   * @param {any} canal - Canal de Supabase a limpiar
   * @returns {Promise<void>}
   */
  async desuscribirCitas(canal: any) {
    if (canal) await this.supabase.removeChannel(canal);
  }

  /**
   * Obtiene el perfil completo del paciente logueado
   * @async
   * @param {string} usuarioId - ID del usuario (paciente) logueado
   * @returns {Promise<any | null>} Objeto del perfil del paciente con datos del usuario y nutricionista, o null si hay error
   */
  async getMiPerfilDePaciente(usuarioId: string) {
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
          nombre_empresa,
          telefono,
          usuario:usuario_id (
            nombre,
            apellidos,
            email,
            avatar_url
          )
        )
      `)
      .eq('usuario_id', usuarioId)
      .single();

    if (error) {
      console.error('Error obteniendo perfil del paciente:', error.message);
      return null;
    }

    return data;
  }
}
