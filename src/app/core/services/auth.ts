import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';


/**
 * Servicio de autenticación que envuelve las operaciones de Supabase.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * Cliente de Supabase para realizar llamadas de autenticación y base de datos.
   */
  private supabase: SupabaseClient;

  /**
   * Indica si el flujo actual corresponde a la recuperación de contraseña.
   */
  public isRecoveringPassword = false;

  /**
   * Inicializa el servicio de autenticación y configura el cliente de Supabase.
   * @param supabaseService Servicio que provee el cliente de Supabase.
   */
  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.client;
    
    // Escuchamos los cambios de sesión de Supabase
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.isRecoveringPassword = true;
      }
    });
  }

  /**
   * Inicia sesión con correo electrónico y contraseña.
   * @param email Correo electrónico del usuario.
   * @param password Contraseña del usuario.
   * @returns Resultado de la operación de inicio de sesión.
   */
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  /**
   * Cierra la sesión del usuario actual.
   * @returns Resultado de la operación de cierre de sesión.
   */
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  /**
   * Obtiene la sesión activa de Supabase.
   * @returns La sesión actual del usuario.
   */
  async getSession() {
    return await this.supabase.auth.getSession();
  }

  /**
   * Obtiene el usuario autenticado actualmente.
   * @returns El usuario autenticado o null si no hay sesión.
   */
  async getUser() {
    return await this.supabase.auth.getUser();
  }

  /**
   * Registra un callback para cambios en el estado de autenticación.
   * @param callback Función que se ejecuta cuando cambia el estado de autenticación.
   * @returns El suscriptor del cambio de estado.
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Obtiene el registro de usuario asociado al usuario autenticado.
   * @returns Los datos del usuario en la tabla 'usuarios' o null si no existe.
   */
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

  /**
   * Obtiene el identificador del nutricionista relacionado con el usuario autenticado.
   * @returns El id del nutricionista o null si no se encuentra.
   */
  async getNutricionistaId(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await this.supabase
      .from('nutricionistas')
      .select('id')
      .eq('usuario_id', (await this.getUsuario())?.id ?? '')
      .maybeSingle();

    if (error) return null;
    return data?.id ?? null;
  }

  /**
   * Registra un nuevo usuario en Supabase con metadata adicional.
   * @param email Correo electrónico del nuevo usuario.
   * @param password Contraseña del nuevo usuario.
   * @param metadata Información adicional asociada al usuario.
   * @returns Resultado de la operación de registro.
   */
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

  /**
   * Obtiene el estado del nutricionista asociado al usuario actual.
   * @returns El estado del nutricionista o null si no existe.
   */
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

  /**
   * Obtiene el identificador del usuario autenticado.
   * @returns El id del usuario actual o una cadena vacía si no hay sesión.
   */
  async getUserId(): Promise<string> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.user?.id ?? '';
  }

  /**
   * Obtiene el identificador del registro de usuario en la tabla 'usuarios'.
   * @returns El id del registro de usuario o una cadena vacía si no se encuentra.
   */
  async getUsuarioId(): Promise<string> {
    const usuario = await this.getUsuario();
    return usuario?.id ?? '';
  }

  /**
   * Inicia el proceso de recuperación de contraseña enviando un enlace al correo.
   * @param email Correo electrónico al que se enviará el enlace de recuperación.
   * @returns Resultado de la operación de restablecimiento de contraseña.
   */
  async resetPasswordForEmail(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ajustes`, // Redirige a los ajustes para que la cambie
    });
  }
}