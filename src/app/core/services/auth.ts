import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async getSession() {
    return await this.supabase.auth.getSession();
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  async getUsuario() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id,nombre, apellidos, rol, avatar_url')
      .eq('auth_user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error obteniendo usuario:', error.message);
      return null;
    }

    return data;
  }

  async getNutricionistaId(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await this.supabase
      .from('nutricionistas')
      .select('id')
      .eq('usuario_id', (await this.getUsuario())?.id ?? '')
      .single();

    if (error) return null;
    return data?.id ?? null;
  }

  async signUp(
    email: string,
    password: string,
    metadata: {
      nombre: string;
      apellidos: string;
      rol: string;
      telefono: string;
      nutricionista_id?: string;
      dni?: string;
      fecha_nacimiento?: string;
      sexo?: string;             
      direccion?: string;       
      motivo_consulta?: string;
      numero_colegiado?: string;
      titulacion?: string | null;
      especialidad?: string;
      nombre_empresa?: string;
      avatar_url?: string | null;
      dni_fiscal?: string;
      direccion_fiscal?: string;
      centros?: any[];
    },
  ) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  }

  async getNutricionistaEstado() {
    const usuario = await this.getUsuario();
    if (!usuario) return null;

    const { data, error } = await this.supabase
      .from('nutricionistas')
      .select('id, estado')
      .eq('usuario_id', usuario.id)
      .single();

    if (error) return null;
    return data;
  }

  async getUserId(): Promise<string> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.user?.id ?? '';
  }

  async getUsuarioId(): Promise<string> {
    const usuario = await this.getUsuario();
    return usuario?.id ?? '';
  }
}
