import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';

/**
 * Componente individual para configurar la vinculación y desvinculación
 * de la cuenta de usuario con la API de Google Calendar.
 *
 * @export
 * @class GoogleCalendarSettingsComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-google-calendar-settings',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonItem, IonLabel],
  template: `
    <ion-item lines="none" class="gcal-item">
      <ion-icon name="logo-google" slot="start" color="danger"></ion-icon>
      <ion-label>
        <h3>Google Calendar</h3>
        <p>{{ conectado ? 'Sincronización activa' : 'No conectado' }}</p>
      </ion-label>
      <ion-button slot="end" [color]="conectado ? 'danger' : 'primary'"
                  fill="outline" (click)="toggleConexion()">
        {{ conectado ? 'Desconectar' : 'Conectar' }}
      </ion-button>
    </ion-item>
  `
})
export class GoogleCalendarSettingsComponent implements OnInit {
  /** Servicio inyectado que maneja los flujos de OAuth y operaciones de GCalendar */
  private gcalService = inject(GoogleCalendarService);
  
  /** Indica si la cuenta del usuario se encuentra actualmente vinculada */
  conectado = false;

  /**
   * Se ejecuta al inicializar el componente.
   * Verifica el estado actual de la conexión consultando la base de datos.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    this.conectado = await this.gcalService.estaConectado();
  }

  /**
   * Alterna el estado de conexión con Google Calendar.
   * Si está conectado, ejecuta la desconexión.
   * Si no está conectado, dispara el flujo de autorización OAuth.
   *
   * @returns {Promise<void>}
   */
  async toggleConexion() {
    if (this.conectado) {
      await this.gcalService.desconectar();
      this.conectado = false;
    } else {
      this.gcalService.iniciarOAuth();
    }
  }
}