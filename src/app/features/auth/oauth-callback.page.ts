import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonSpinner, IonContent } from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { SupabaseService } from '../../core/services/supabase';

/**
 * Página encargada de recibir el callback de OAuth de Google Calendar.
 * Captura el código de autorización de la URL, espera a que la sesión de Supabase esté lista
 * y lo envía al backend para completar la integración.
 *
 * @export
 * @class OAuthCallbackPage
 * @implements {OnInit}
 */
@Component({
  standalone: true,
  imports: [IonSpinner, IonContent],
  template: `
    <ion-content class="ion-text-center ion-padding">
      <ion-spinner></ion-spinner>
      <p>Conectando con Google Calendar...</p>
    </ion-content>
  `
})
export class OAuthCallbackPage implements OnInit {
  /** Servicio para obtener los parámetros de la URL (el código OAuth) */
  private route = inject(ActivatedRoute);
  /** Servicio para navegar de vuelta a los ajustes tras la integración */
  private router = inject(Router);
  /** Servicio específico para manejar la lógica de Google Calendar */
  private gcal = inject(GoogleCalendarService);
  /** Cliente de base de datos de Supabase */
  private supabase = inject(SupabaseService).client;

  /**
   * Método del ciclo de vida de Angular. Se ejecuta al iniciar la página.
   * Extrae el código de autenticación y ejecuta el proceso de vinculación.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    console.log('OAuth callback — code presente:', !!code);

    if (!code) {
      await this.router.navigate(['/ajustes'], { queryParams: { gcal: 'error' } });
      return;
    }

    try {
      const session = await this.waitForSession();
      console.log('Sesión obtenida:', session?.access_token ? 'OK' : 'NINGUNA');

      if (!session) throw new Error('No hay sesión activa');

      await this.gcal.handleCallback(code);
      await this.router.navigate(['/ajustes'], { queryParams: { gcal: 'ok' } });
    } catch (e) {
      console.error('Error en OAuth callback:', e);
      await this.router.navigate(['/ajustes'], { queryParams: { gcal: 'error' } });
    }
  }

  /**
   * Método de utilidad que espera a que exista una sesión activa de Supabase.
   * Esto es necesario porque al redirigir de vuelta desde Google, la sesión
   * puede tardar unos milisegundos en inicializarse en el cliente.
   *
   * @private
   * @param {number} [maxWaitMs=5000] - Tiempo máximo de espera en milisegundos.
   * @returns {Promise<any>} Promesa que resuelve con la sesión o null si hay timeout.
   */
  private async waitForSession(maxWaitMs = 5000): Promise<any> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        console.warn('waitForSession: timeout alcanzado sin sesión');
        resolve(null);
      }, maxWaitMs);

      const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth event:', event, '| sesión:', session?.access_token ? 'OK' : 'vacía');
          if (session?.access_token) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(session);
          }
        }
      );

      // Comprueba si la sesión ya está disponible en este momento
      this.supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Sesión inmediata:', session?.access_token ?? 'NINGUNA');
        if (session?.access_token) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }
}