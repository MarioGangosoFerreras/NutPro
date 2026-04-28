import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Cita {
  id?: string;
  paciente_id: string;
  nutricionista_id: string;
  fecha_hora: string;
  duracion_min: number;
  tipo: 'presencial' | 'videollamada';
  estado: 'pendiente' | 'confirmada' | 'cancelada';
  notas?: string;
  motivo_solicitud?: string;
  url_videollamada?: string;
  cancelado_por?: string;
  pacientes?: { usuarios: { nombre: string; apellidos: string; avatar_url: string } };
  facturada?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private supabase = inject(SupabaseService).client;

  async getCitasNutricionista(nutricionistaId: string): Promise<Cita[]> {
    const { data, error } = await this.supabase
      .from('citas')
      .select('*, pacientes(usuarios(nombre, apellidos, avatar_url))')
      .eq('nutricionista_id', nutricionistaId)
      .order('fecha_hora', { ascending: true });
    if (error) throw error;
    return data as Cita[];
  }

  async getCitasPaciente(pacienteId: string, nutricionistaId: string): Promise<Cita[]> {
    const { data, error } = await this.supabase
      .from('citas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('nutricionista_id', nutricionistaId)
      .order('fecha_hora', { ascending: true });
    if (error) throw error;
    return data as Cita[];
  }

  async crearCita(cita: Omit<Cita, 'id'>): Promise<Cita> {
    const { data, error } = await this.supabase
      .from('citas')
      .insert(cita)
      .select()
      .single();
    if (error) throw error;
    return data as Cita;
  }

  async editarCita(id: string, cambios: Partial<Cita>): Promise<Cita> {
    const { data, error } = await this.supabase
      .from('citas')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Cita;
  }

  async confirmarCita(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('citas')
      .update({ estado: 'confirmada' })
      .eq('id', id);
    if (error) throw error;
  }

  async cancelarCita(id: string, canceladoPor: string): Promise<void> {
    const { error } = await this.supabase
      .from('citas')
      .update({ estado: 'cancelada', cancelado_por: canceladoPor })
      .eq('id', id);
    if (error) throw error;
  }

  async eliminarCita(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('citas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Para el dashboard: citas de hoy + mañana
  async getCitasProximas(nutricionistaId: string): Promise<Cita[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const pasadoManana = new Date(hoy);
    pasadoManana.setDate(pasadoManana.getDate() + 2);

    const { data, error } = await this.supabase
      .from('citas')
      .select('*, pacientes(usuarios(nombre, apellidos, avatar_url))')
      .eq('nutricionista_id', nutricionistaId)
      .neq('estado', 'cancelada')
      .gte('fecha_hora', hoy.toISOString())
      .lt('fecha_hora', pasadoManana.toISOString())
      .order('fecha_hora', { ascending: true });
    if (error) throw error;
    return data as Cita[];
  }

  // Para el calendario: citas de un mes concreto
  async getCitasMes(nutricionistaId: string, año: number, mes: number): Promise<Cita[]> {
    const inicio = new Date(año, mes, 1).toISOString();
    const fin    = new Date(año, mes + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await this.supabase
      .from('citas')
      .select('*, pacientes(usuarios(nombre, apellidos, avatar_url))')
      .eq('nutricionista_id', nutricionistaId)
      .gte('fecha_hora', inicio)
      .lte('fecha_hora', fin)
      .order('fecha_hora', { ascending: true });
    if (error) throw error;
    return data as Cita[];
  }

  suscribirCambios(nutricionistaId: string, callback: (cita: Cita) => void) {
    return this.supabase
      .channel('citas-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'citas',
        filter: `nutricionista_id=eq.${nutricionistaId}`
      }, payload => callback(payload.new as Cita))
      .subscribe();
  }
}