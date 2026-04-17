// google-calendar-settings.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';

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
  private gcalService = inject(GoogleCalendarService);
  conectado = false;

  async ngOnInit() {
    this.conectado = await this.gcalService.estaConectado();
  }

  async toggleConexion() {
    if (this.conectado) {
      await this.gcalService.desconectar();
      this.conectado = false;
    } else {
      this.gcalService.iniciarOAuth();
    }
  }
}