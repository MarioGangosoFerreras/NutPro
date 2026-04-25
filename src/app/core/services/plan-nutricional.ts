import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class PlanNutricionalService {
  private supabase = inject(SupabaseService).client; // Acceso al cliente de Supabase
  private authService = inject(AuthService);

  // --- GESTIÓN DE PLANES ---

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
    // Desactivamos planes anteriores
    await this.supabase.from('planes_nutricionales').update({ activo: false }).eq('paciente_id', pacienteId);
    
    const { data, error } = await this.supabase
      .from('planes_nutricionales')
      .insert({ ...plan, paciente_id: pacienteId, activo: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- GESTIÓN DEL MENÚ SEMANAL (Lo que faltaba) ---

  async getOrCreateMenuParaPlan(planId: string, pacienteId: string) {
    let { data: menu, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;

    if (!menu) {
      const nutricionistaId = await this.authService.getNutricionistaId();
      
      // 1. Calculamos la fecha de inicio (Hoy) y la fecha de fin (+6 días)
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 6); // Sumamos 6 días para completar la semana

      const { data: nuevoMenu, error: insertError } = await this.supabase
        .from('menus_semanales')
        .insert({
          plan_id: planId,
          paciente_id: pacienteId,
          nutricionista_id: nutricionistaId,
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_fin: fechaFin.toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      menu = nuevoMenu;
    }
    return menu;
  }

  async getEntradasMenu(menuId: string) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .select('*, receta:recetas(id, nombre, calorias_kcal)') 
      .eq('menu_id', menuId);
    if (error) throw error;
    return data || [];
  }

  async addEntradaMenu(entrada: any) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .insert(entrada)
      // CAMBIO AQUÍ TAMBIÉN
      .select('*, receta:recetas(id, nombre, calorias_kcal)')
      .single();
    if (error) throw error;
    return data;
  }

  async deleteEntradaMenu(id: string) {
    const { error } = await this.supabase
      .from('menu_entradas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}