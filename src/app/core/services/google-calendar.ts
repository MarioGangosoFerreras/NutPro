import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { AuthService } from './auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

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
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No hay sesión activa al manejar el callback de Google');
    }

    // Usar fetch directo en lugar de functions.invoke para tener control total del header
    const response = await fetch(`${environment.supabaseUrl}/functions/v1/google-oauth-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: environment.supabaseKey,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Error en google-oauth-exchange: ${response.status} — ${err}`);
    }
  }

  async estaConectado(nutricionistaId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('nutricionista_google_tokens')
      .select('nutricionista_id')
      .eq('nutricionista_id', nutricionistaId)
      .maybeSingle();
    return !!data;
  }

  async desconectar(nutricionistaId: string): Promise<void> {
    await this.supabase
      .from('nutricionista_google_tokens')
      .delete()
      .eq('nutricionista_id', nutricionistaId);
  }
}
