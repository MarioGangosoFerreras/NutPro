import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Servicio para manejar la conexión y operaciones con Supabase.
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  /**
   * Constructor que inicializa el cliente de Supabase utilizando las variables de entorno.
   */
  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /**
   * Getter que devuelve el cliente de Supabase.
   * @returns {SupabaseClient} El cliente de Supabase.
   */
  get client() {
    return this.supabase;
  }
}