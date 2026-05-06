import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { environment } from '../../../environments/environment';

/**
 * Servicio para gestionar la integración con Google Calendar.
 * Proporciona funcionalidades para autenticación OAuth, verificación de conexión
 * y gestión del estado de la conexión con Google Calendar.
 *
 * @class GoogleCalendarService
 * @injectable
 */
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private supabase = inject(SupabaseService).client;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  /**
   * Inicia el flujo de autenticación OAuth con Google.
   * Redirige al usuario a la página de consentimiento de Google.
   *
   * @method iniciarOAuth
   * @returns {void}
   */
  iniciarOAuth() {
    const params = new URLSearchParams({
      client_id: environment.googleClientId,
      redirect_uri: environment.googleRedirectUri,
      response_type: 'code',
      scope: this.SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Maneja el callback de autenticación OAuth con Google.
   * Intercambia el código de autorización por tokens de acceso y refresco.
   *
   * @method handleCallback
   * @param {string} code - Código de autorización devuelto por Google
   * @returns {Promise<void>}
   * @throws {Error} Si no hay sesión activa o si falla el intercambio de tokens
   */
  async handleCallback(code: string): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) throw new Error('No hay sesión activa');

    const response = await fetch(
      `${environment.supabaseUrl}/functions/v1/google-oauth-exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': environment.supabaseKey,
        },
        body: JSON.stringify({ code }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error en google-oauth-exchange: ${response.status} — ${err}`);
    }
  }

  /**
   * Verifica si el usuario está conectado a Google Calendar.
   * Consulta el estado de la conexión con Google Calendar.
   *
   * @method estaConectado
   * @returns {Promise<boolean>} Retorna true si está conectado, false en caso contrario
   * @throws {Error} Si falla la solicitud al servidor
   */
  async estaConectado(): Promise<boolean> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) return false;

    const response = await fetch(
      `${environment.supabaseUrl}/functions/v1/google-calendar-status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': environment.supabaseKey,
        },
      }
    );

    if (!response.ok) return false;
    const { conectado } = await response.json();
    return conectado;
  }

  /**
   * Desconecta el usuario de Google Calendar.
   * Revoca la conexión y elimina los tokens almacenados.
   *
   * @method desconectar
   * @returns {Promise<void>}
   * @throws {Error} Si falla la solicitud al servidor
   */
  async desconectar(): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(
      `${environment.supabaseUrl}/functions/v1/google-calendar-status`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': environment.supabaseKey,
        },
      }
    );
  }
}