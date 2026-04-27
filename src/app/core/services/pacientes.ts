import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root',
})
export class PacientesService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  get supabaseClient() {
    return this.supabase;
  }

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

  // src/app/core/services/pacientes.ts

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

  async eliminarPaciente(id: string, usuarioId: string) {
    // Al borrar usuario, paciente se borra en cascada
    const { error } = await this.supabase.from('usuarios').delete().eq('id', usuarioId);

    if (error) throw error;
  }

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

  // Método para limpiar canales desde el componente
  async desuscribirCitas(canal: any) {
    if (canal) await this.supabase.removeChannel(canal);
  }
}
