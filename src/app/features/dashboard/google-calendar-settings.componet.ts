// google-calendar-settings.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonItem, IonLabel, IonToggle } from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { AuthService } from '../../core/services/auth';

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
  private gcalService  = inject(GoogleCalendarService);
  private authService  = inject(AuthService);
  conectado = false;
  nutricionistaId = '';

  async ngOnInit() {
    this.nutricionistaId = (await this.authService.getNutricionistaId()) ?? '';
    this.conectado = await this.gcalService.estaConectado(this.nutricionistaId);
  }

  async toggleConexion() {
    if (this.conectado) {
      await this.gcalService.desconectar(this.nutricionistaId);
      this.conectado = false;
    } else {
      this.gcalService.iniciarOAuth(); // redirige a Google
    }
  }
}