import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class FichaClinicaService {
  private supabase;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // ── ANTECEDENTES FAMILIARES ──────────────────────────────────────────────

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
    // Extraemos solo los campos de la tabla (evitamos enviar id, timestamps, etc.)
    const payload = {
      paciente_id: pacienteId,
      hta: datos.hta ?? false,
      ecv: datos.ecv ?? false,
      diabetes: datos.diabetes ?? false,
      enfermedad_autoinmune: datos.enfermedad_autoinmune ?? false,
      alergias: datos.alergias ?? false,
      obesidad: datos.obesidad ?? false,
      cancer: datos.cancer ?? false,
      otra: datos.otra ?? null,
    };

    const { error } = await this.supabase
      .from('antecedentes_familiares')
      .upsert(payload, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── ANTECEDENTES PERSONALES ──────────────────────────────────────────────

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
    const payload = {
      paciente_id: pacienteId,
      alcohol: datos.alcohol ?? false,
      tabaco: datos.tabaco ?? false,
      cirugias: datos.cirugias ?? false,
      alergias: datos.alergias ?? false,
      descansa_bien: datos.descansa_bien ?? false,
      enfermedad_patologia: datos.enfermedad_patologia ?? null,
      medicacion: datos.medicacion ?? null,
      digestiones: datos.digestiones ?? null,
      menstruacion: datos.menstruacion ?? null,
      suplementos_nutricionales: datos.suplementos_nutricionales ?? null,
      actividad_fisica: datos.actividad_fisica ?? null,
    };

    const { error } = await this.supabase
      .from('antecedentes_personales')
      .upsert(payload, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── ENCUESTA ALIMENTARIA ─────────────────────────────────────────────────

  async getEncuestaAlimentaria(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('encuesta_alimentaria')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertEncuestaAlimentaria(pacienteId: string, datos: any) {
    // Nunca enviamos: id, imc (columna generada en BD)
    const payload = {
      paciente_id: pacienteId,
      fecha: datos.fecha ?? new Date().toISOString().split('T')[0],
      come_en_casa: datos.come_en_casa ?? null,
      hace_la_comida: datos.hace_la_comida ?? null,
      le_gusta_cocinar: datos.le_gusta_cocinar ?? null,
      come_solo_tv: datos.come_solo_tv ?? null,
      num_comidas_dia: datos.num_comidas_dia ?? null,
      come_tranquilo: datos.come_tranquilo ?? null,
      ansiedad_comida: datos.ansiedad_comida ?? null,
      apetito: datos.apetito ?? null,
      picotea: datos.picotea ?? null,
      consumo_agua_litros: datos.consumo_agua_litros ?? null,
      otras_bebidas: datos.otras_bebidas ?? null,
      preferencias_alimentarias: datos.preferencias_alimentarias ?? null,
      aversiones_alimentarias: datos.aversiones_alimentarias ?? null,
    };

    const { error } = await this.supabase
      .from('encuesta_alimentaria')
      .upsert(payload, { onConflict: 'paciente_id' });
    if (error) throw error;
  }

  // ── MEDICIONES ───────────────────────────────────────────────────────────

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
    // imc es columna generada: NO se envía, Supabase la calcula sola
    const payload: any = {
      paciente_id: pacienteId,
      fecha: datos.fecha ?? new Date().toISOString().split('T')[0],
    };

    // Solo añadimos los campos numéricos si tienen valor real
    if (datos.peso_kg) payload.peso_kg = Number(datos.peso_kg);
    if (datos.altura_cm) payload.altura_cm = Number(datos.altura_cm);
    if (datos.grasa_corporal_pct) payload.grasa_corporal_pct = Number(datos.grasa_corporal_pct);
    if (datos.masa_muscular_kg) payload.masa_muscular_kg = Number(datos.masa_muscular_kg);
    if (datos.perimetro_cintura_cm) payload.perimetro_cintura_cm = Number(datos.perimetro_cintura_cm);
    if (datos.notas) payload.notas = datos.notas;

    const { error } = await this.supabase
      .from('mediciones')
      .insert(payload);
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