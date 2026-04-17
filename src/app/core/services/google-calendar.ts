import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private supabase = inject(SupabaseService).client;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

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

  // Usa el token de sesión para llamar a una Edge Function
  // en lugar de consultar la tabla directamente con RLS
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