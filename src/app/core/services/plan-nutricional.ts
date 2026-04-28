import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class PlanNutricionalService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

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

  async getHistorialPlanes(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('planes_nutricionales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

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

  // Método de SOLO LECTURA para que lo use el paciente
  async getMenuParaPlan(planId: string) {
    const { data, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getEntradasMenu(menuId: string) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .select('*, receta:recetas(id, nombre, calorias_kcal, proteina_g, imagen_url)')
      .eq('menu_id', menuId);
    if (error) throw error;
    return data || [];
  }

  async addEntradaMenu(entrada: any) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .insert(entrada)
      .select('*, receta:recetas(id, nombre, calorias_kcal, proteina_g, imagen_url)')
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEntradaMenu(id: string) {
    const { error } = await this.supabase.from('menu_entradas').delete().eq('id', id);
    if (error) throw error;
  }

  // Obtiene todos los menús semanales del paciente
  async getHistorialMenus(pacienteId: string) {
    const { data, error } = await this.supabase
      .from('menus_semanales')
      .select('*, plan:planes_nutricionales(*)')
      .eq('paciente_id', pacienteId)
      .order('fecha_inicio', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Copia las recetas de un menú viejo al menú actual
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
