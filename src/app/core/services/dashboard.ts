import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

export interface EstadisticasDashboard {
  pacientesActivos: number;
  pacientesNuevosEsteMes: number;
  citasHoy: number;
  proximaCita: string | null;
  mensajesSinLeer: number;
  pacientesPendienteSeguimiento: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  async getStats(nutricionistaId: string): Promise<EstadisticasDashboard> {
    const [
      pacientesActivos,
      pacientesNuevosEsteMes,
      citasHoy,
      mensajesSinLeer,
      pacientesPendienteSeguimiento,
    ] = await Promise.all([
      this.getPacientesActivos(nutricionistaId),
      this.getPacientesNuevosEsteMes(nutricionistaId),
      this.getCitasHoy(nutricionistaId),
      this.getMensajesSinLeer(nutricionistaId),
      this.getPacientesSinSeguimiento(nutricionistaId),
    ]);

    return {
      pacientesActivos: pacientesActivos.count,
      pacientesNuevosEsteMes: pacientesNuevosEsteMes.count,
      citasHoy: citasHoy.count,
      proximaCita: citasHoy.proxima,
      mensajesSinLeer: mensajesSinLeer,
      pacientesPendienteSeguimiento: pacientesPendienteSeguimiento,
    };
  }

  // Total de pacientes del nutricionista
  private async getPacientesActivos(nutricionistaId: string) {
    const { count, error } = await this.supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('nutricionista_id', nutricionistaId);

    if (error) console.error('Error pacientes activos:', error.message);
    return { count: count ?? 0 };
  }

  // Pacientes creados en el mes actual (para el sublabel "+X este mes")
  private async getPacientesNuevosEsteMes(nutricionistaId: string) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('nutricionista_id', nutricionistaId)
      .gte('created_at', inicioMes.toISOString());

    if (error) console.error('Error pacientes nuevos:', error.message);
    return { count: count ?? 0 };
  }

  // Citas de hoy no canceladas + hora de la próxima
  private async getCitasHoy(nutricionistaId: string) {
    const hoy = new Date();
    const inicioDia = new Date(hoy);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);

    const { data, error } = await this.supabase
      .from('citas')
      .select('id, fecha_hora, estado')
      .eq('nutricionista_id', nutricionistaId)
      .neq('estado', 'cancelada')
      .gte('fecha_hora', inicioDia.toISOString())
      .lte('fecha_hora', finDia.toISOString())
      .order('fecha_hora', { ascending: true });

    if (error) console.error('Error citas hoy:', error.message);

    const citas = data ?? [];
    const ahora = new Date();

    // Primera cita que aún no ha pasado
    const proxima = citas.find(c => new Date(c.fecha_hora) > ahora);
    const proximaFormateada = proxima
      ? new Date(proxima.fecha_hora).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
      : null;

    return { count: citas.length, proxima: proximaFormateada };
  }

  // Mensajes sin leer enviados por pacientes del nutricionista
  private async getMensajesSinLeer(nutricionistaId: string): Promise<number> {
    // Obtenemos el usuario_id del nutricionista para excluir sus propios mensajes
    const { data: nutriData } = await this.supabase
      .from('nutricionistas')
      .select('usuario_id')
      .eq('id', nutricionistaId)
      .single();

    const nutriUsuarioId = nutriData?.usuario_id ?? null;

    // Obtenemos los chats de este nutricionista
    const { data: chats } = await this.supabase
      .from('chats')
      .select('id')
      .eq('nutricionista_id', nutricionistaId);

    const chatIds = chats?.map((c: any) => c.id) ?? [];
    if (!chatIds.length) return 0;

    // Mensajes sin leer en esos chats, excluyendo los del propio nutricionista
    let query = this.supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('leido', false)
      .in('chat_id', chatIds);

    if (nutriUsuarioId) {
      query = query.neq('sender_id', nutriUsuarioId);
    }

    const { count, error } = await query;

    if (error) console.error('Error mensajes sin leer:', error.message);
    return count ?? 0;
  }

  // Pacientes sin medición en los últimos 7 días
  private async getPacientesSinSeguimiento(nutricionistaId: string): Promise<number> {
    const { data: pacientes, error: errorPacientes } = await this.supabase
      .from('pacientes')
      .select('id')
      .eq('nutricionista_id', nutricionistaId);

    if (errorPacientes || !pacientes?.length) return 0;

    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const fechaCorte = hace7Dias.toISOString().split('T')[0];

    const ids = pacientes.map((p: any) => p.id);

    // Pacientes que SÍ tienen medición reciente
    const { data: conMedicion, error: errorMedicion } = await this.supabase
      .from('mediciones')
      .select('paciente_id')
      .in('paciente_id', ids)
      .gte('fecha', fechaCorte);

    if (errorMedicion) console.error('Error seguimiento:', errorMedicion.message);

    const idsConMedicion = new Set(
      (conMedicion ?? []).map((m: any) => m.paciente_id)
    );

    return pacientes.filter((p: any) => !idsConMedicion.has(p.id)).length;
  }
}