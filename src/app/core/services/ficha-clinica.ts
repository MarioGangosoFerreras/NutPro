import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

/**
 * Servicio de gestión de Ficha Clínica.
 * 
 * Proporciona métodos para realizar operaciones CRUD en las diferentes secciones
 * de la ficha clínica del paciente, incluyendo antecedentes familiares, antecedentes
 * personales, encuesta alimentaria y mediciones.
 */
@Injectable({ providedIn: 'root' })
export class FichaClinicaService {
  private supabase;

  /**
   * Constructor del servicio.
   * 
   * @param supabaseService - Servicio de Supabase inyectado.
   */
  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  // ── ANTECEDENTES FAMILIARES ──────────────────────────────────────────────

  /**
   * Obtiene los antecedentes familiares de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @returns Objeto con los antecedentes familiares o null si no existen.
   * @throws Error si ocurre un error en la consulta.
   */
  async getAntecedentesFamiliares(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('antecedentes_familiares')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Inserta o actualiza los antecedentes familiares de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @param datos - Objeto con los datos de antecedentes familiares a guardar.
   * @throws Error si ocurre un error en la operación.
   */
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

  /**
   * Obtiene los antecedentes personales de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @returns Objeto con los antecedentes personales o null si no existen.
   * @throws Error si ocurre un error en la consulta.
   */
  async getAntecedentesPersonales(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('antecedentes_personales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Inserta o actualiza los antecedentes personales de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @param datos - Objeto con los datos de antecedentes personales a guardar.
   * @throws Error si ocurre un error en la operación.
   */
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

  /**
   * Obtiene la encuesta alimentaria de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @returns Objeto con los datos de la encuesta alimentaria o null si no existe.
   * @throws Error si ocurre un error en la consulta.
   */
  async getEncuestaAlimentaria(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('encuesta_alimentaria')
      .select('*')
      .eq('paciente_id', pacienteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Inserta o actualiza la encuesta alimentaria de un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @param datos - Objeto con los datos de la encuesta alimentaria a guardar.
   * @throws Error si ocurre un error en la operación.
   */
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

  /**
   * Obtiene todas las mediciones de un paciente ordenadas por fecha descendente.
   * 
   * @param pacienteId - ID del paciente.
   * @returns Array con las mediciones del paciente, o array vacío si no existen.
   * @throws Error si ocurre un error en la consulta.
   */
  async getMediciones(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('mediciones')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /**
   * Añade una nueva medición para un paciente.
   * 
   * @param pacienteId - ID del paciente.
   * @param datos - Objeto con los datos de la medición a insertar.
   * @throws Error si ocurre un error en la operación.
   */
  async addMedicion(pacienteId: string, datos: any) {
    const payload: any = {
      paciente_id: pacienteId,
      fecha: datos.fecha ?? new Date().toISOString().split('T')[0],
      registrado_por: datos.registrado_por
    };

    if (datos.peso_kg) payload.peso_kg = Number(datos.peso_kg);
    if (datos.altura_cm) payload.altura_cm = Number(datos.altura_cm);
    if (datos.grasa_corporal_pct) payload.grasa_corporal_pct = Number(datos.grasa_corporal_pct);
    if (datos.masa_muscular_kg) payload.masa_muscular_kg = Number(datos.masa_muscular_kg);
    if (datos.perimetro_cintura_cm)
      payload.perimetro_cintura_cm = Number(datos.perimetro_cintura_cm);
    if (datos.perimetro_cadera_cm) payload.perimetro_cadera_cm = Number(datos.perimetro_cadera_cm);
    if (datos.perimetro_abdomen_cm)
      payload.perimetro_abdomen_cm = Number(datos.perimetro_abdomen_cm);
    if (datos.notas) payload.notas = datos.notas;

    await this.supabase.from('mediciones').insert(payload);
  }

  /**
   * Actualiza una medición existente.
   * 
   * @param id - ID de la medición a actualizar.
   * @param datos - Objeto con los datos de la medición a actualizar.
   * @throws Error si ocurre un error en la operación.
   */
  async updateMedicion(id: string, datos: any) {
    // imc e indice_cintura_cadera son columnas generadas: NO se envían
    const payload: any = {
      fecha: datos.fecha ?? new Date().toISOString().split('T')[0],
    };

    if (datos.peso_kg) payload.peso_kg = Number(datos.peso_kg);
    if (datos.altura_cm) payload.altura_cm = Number(datos.altura_cm);
    if (datos.grasa_corporal_pct) payload.grasa_corporal_pct = Number(datos.grasa_corporal_pct);
    if (datos.masa_muscular_kg) payload.masa_muscular_kg = Number(datos.masa_muscular_kg);
    if (datos.perimetro_cintura_cm)
      payload.perimetro_cintura_cm = Number(datos.perimetro_cintura_cm);
    if (datos.perimetro_cadera_cm) payload.perimetro_cadera_cm = Number(datos.perimetro_cadera_cm);
    if (datos.perimetro_abdomen_cm)
      payload.perimetro_abdomen_cm = Number(datos.perimetro_abdomen_cm);
    // notas puede ser string vacío (para borrarla), así que chequeamos distinto
    payload.notas = datos.notas || null;

    const { error } = await this.supabase.from('mediciones').update(payload).eq('id', id);
    if (error) throw error;
  }

  /**
   * Elimina una medición.
   * 
   * @param id - ID de la medición a eliminar.
   * @throws Error si ocurre un error en la operación.
   */
  async deleteMedicion(id: string) {
    const { error } = await this.supabase.from('mediciones').delete().eq('id', id);
    if (error) throw error;
  }
}
