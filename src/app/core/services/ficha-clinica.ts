import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class FichaClinicaService {
  private supabase;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // ── ANTECEDENTES FAMILIARES ──
  async getAntecedentesFamiliares(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('antecedentes_familiares')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertAntecedentesFamiliares(pacienteId: string, datos: any) {
    const { error } = await this.supabase
      .from('antecedentes_familiares')
      .upsert({ ...datos, paciente_id: pacienteId }, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── ANTECEDENTES PERSONALES ──
  async getAntecedentesPersonales(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('antecedentes_personales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertAntecedentesPersonales(pacienteId: string, datos: any) {
    const { error } = await this.supabase
      .from('antecedentes_personales')
      .upsert({ ...datos, paciente_id: pacienteId }, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── ENCUESTA ALIMENTARIA ──
  async getEncuestaAlimentaria(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('encuesta_alimentaria')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertEncuestaAlimentaria(pacienteId: string, datos: any) {
    const { error } = await this.supabase
      .from('encuesta_alimentaria')
      .upsert({ ...datos, paciente_id: pacienteId }, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── MEDICIONES ──
  async getMediciones(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('mediciones')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addMedicion(pacienteId: string, datos: any) {
    const { error } = await this.supabase
      .from('mediciones')
      .insert({ ...datos, paciente_id: pacienteId });
    if (error) throw error;
  }

  async deleteMedicion(id: string) {
    const { error } = await this.supabase
      .from('mediciones')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}