import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';

/**
 * Servicio para gestionar planes nutricionales de pacientes.
 * Proporciona métodos para crear, obtener, modificar y gestionar planes nutricionales,
 * así como menús semanales y sus entradas asociadas.
 * @class PlanNutricionalService
 */
@Injectable({ providedIn: 'root' })
export class PlanNutricionalService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Obtiene el plan nutricional activo de un paciente.
   * @param {string} pacienteId - Identificador del paciente
   * @returns {Promise<any>} El plan nutricional activo del paciente, o null si no existe
   * @throws {Error} Si ocurre un error en la consulta a la base de datos
   */
  async getPlanActivo(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('planes_nutricionales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Obtiene el historial completo de planes nutricionales de un paciente.
   * @param {string} pacienteId - Identificador del paciente
   * @returns {Promise<any[]>} Lista de planes nutricionales ordenados por fecha de creación
   * @throws {Error} Si ocurre un error en la consulta a la base de datos
   */
  async getHistorialPlanes(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('planes_nutricionales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  /**
   * Crea o actualiza un plan nutricional, desactivando planes anteriores.
   * Desactiva todos los planes previos del paciente e inserta un nuevo plan activo.
   * @param {string} pacienteId - Identificador del paciente
   * @param {any} plan - Objeto con los datos del plan nutricional a crear
   * @returns {Promise<any>} El nuevo plan nutricional creado
   * @throws {Error} Si ocurre un error en la operación de base de datos
   */
  async upsertPlan(pacienteId: string, plan: any) {
    await this.supabase
      .from('planes_nutricionales')
      .update({ activo: false })
      .eq('paciente_id', pacienteId);
    const { data, error } = await this.supabase
      .from('planes_nutricionales')
      .insert({ ...plan, paciente_id: pacienteId, activo: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Obtiene o crea un menú semanal para un plan nutricional.
   * Si el menú no existe, crea uno nuevo con fechas de inicio y fin (7 días).
   * @param {string} planId - Identificador del plan nutricional
   * @param {string} pacienteId - Identificador del paciente propietario del plan
   * @returns {Promise<any>} El menú semanal existente o recién creado
   * @throws {Error} Si ocurre un error en la operación de base de datos
   */
  async getOrCreateMenuParaPlan(planId: string, pacienteId: string) {
    let { data: menu, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;

    if (!menu) {
      const nutricionistaId = await this.authService.getNutricionistaId();
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 6);

      const { data: nuevoMenu, error: insertError } = await this.supabase
        .from('menus_semanales')
        .insert({
          plan_id: planId,
          paciente_id: pacienteId,
          nutricionista_id: nutricionistaId,
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_fin: fechaFin.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) throw insertError;
      menu = nuevoMenu;
    }
    return menu;
  }

  /**
   * Obtiene un menú semanal para un plan nutricional (solo lectura).
   * Método de lectura para pacientes que necesitan ver su menú.
   * @param {string} planId - Identificador del plan nutricional
   * @returns {Promise<any>} El menú semanal asociado al plan, o null si no existe
   * @throws {Error} Si ocurre un error en la consulta a la base de datos
   */
  async getMenuParaPlan(planId: string) {
    const { data, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene todas las entradas (recetas) de un menú semanal.
   * @param {string} menuId - Identificador del menú semanal
   * @returns {Promise<any[]>} Lista de entradas con información de la receta asociada
   * @throws {Error} Si ocurre un error en la consulta a la base de datos
   */
  async getEntradasMenu(menuId: string) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .select('*, receta:recetas(id, nombre, calorias_kcal, proteina_g, imagen_url)')
      .eq('menu_id', menuId);
    if (error) throw error;
    return data || [];
  }

  /**
   * Añade una nueva entrada (receta) a un menú semanal.
   * @param {any} entrada - Objeto con los datos de la entrada a añadir
   * @returns {Promise<any>} La entrada recién creada con la información de la receta
   * @throws {Error} Si ocurre un error en la inserción
   */
  async addEntradaMenu(entrada: any) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .insert(entrada)
      .select('*, receta:recetas(id, nombre, calorias_kcal, proteina_g, imagen_url)')
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Elimina una entrada de un menú semanal.
   * @param {string} id - Identificador de la entrada a eliminar
   * @throws {Error} Si ocurre un error en la eliminación
   */
  async deleteEntradaMenu(id: string) {
    const { error } = await this.supabase.from('menu_entradas').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Obtiene todos los menús semanales de un paciente con sus planes asociados.
   * @param {string} pacienteId - Identificador del paciente
   * @returns {Promise<any[]>} Lista de menús semanales ordenados por fecha de inicio (descendente)
   * @throws {Error} Si ocurre un error en la consulta a la base de datos
   */
  async getHistorialMenus(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('menus_semanales')
      .select('*, plan:planes_nutricionales(*)')
      .eq('paciente_id', pacienteId)
      .order('fecha_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /**
   * Copia todas las entradas (recetas) de un menú antiguo a un menú nuevo.
   * Elimina las entradas existentes en el menú destino antes de copiar.
   * @param {string} menuOrigenId - Identificador del menú de origen
   * @param {string} menuDestinoId - Identificador del menú destino
   * @throws {Error} Si ocurre un error en la operación de base de datos
   */
  async copiarEntradasMenu(menuOrigenId: string, menuDestinoId: string) {
    // 1. Borramos las recetas que haya en el menú actual para reemplazarlas
    await this.supabase.from('menu_entradas').delete().eq('menu_id', menuDestinoId);

    // 2. Traemos las recetas del menú antiguo
    const { data: entradasAntiguas } = await this.supabase
      .from('menu_entradas')
      .select('*')
      .eq('menu_id', menuOrigenId);

    if (!entradasAntiguas || entradasAntiguas.length === 0) return;

    // 3. Las insertamos vinculadas al menú nuevo
    const nuevasEntradas = entradasAntiguas.map((e) => ({
      menu_id: menuDestinoId,
      receta_id: e.receta_id,
      dia_semana: e.dia_semana,
      tipo_comida: e.tipo_comida,
      raciones: e.raciones,
    }));

    const { error } = await this.supabase.from('menu_entradas').insert(nuevasEntradas);
    if (error) throw error;
  }
}
