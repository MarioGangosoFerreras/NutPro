import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonButton, IonIcon, ViewWillEnter // <-- Importado de Ionic
} from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { addIcons } from 'ionicons';
import { logoGoogle } from 'ionicons/icons';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle,
            IonItem, IonLabel, IonButton, IonIcon],
  templateUrl: './ajustes.html',
})
export class AjustesPage implements ViewWillEnter { // <-- Cambiado OnInit por ViewWillEnter
  private gcalService = inject(GoogleCalendarService);
  conectado = false;

  constructor() { addIcons({ logoGoogle }); }

  // <-- Se ejecuta SIEMPRE que entras a la pantalla, no solo la primera vez
  async ionViewWillEnter() { 
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