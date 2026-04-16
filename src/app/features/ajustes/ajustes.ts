import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { AuthService } from '../../core/services/auth';
import { addIcons } from 'ionicons';
import { logoGoogle } from 'ionicons/icons';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonButton, IonIcon],
  templateUrl: './ajustes.html',
})
export class AjustesPage implements OnInit {
  private gcalService = inject(GoogleCalendarService);
  private authService = inject(AuthService);
  conectado = false;
  nutricionistaId = '';

  constructor() {
    addIcons({ logoGoogle });
  }

  async ngOnInit() {
    this.nutricionistaId = (await this.authService.getNutricionistaId()) ?? '';
    this.conectado = await this.gcalService.estaConectado(this.nutricionistaId);
  }

  async toggleConexion() {
    if (this.conectado) {
      await this.gcalService.desconectar(this.nutricionistaId);
      this.conectado = false;
    } else {
      this.gcalService.iniciarOAuth();
    }
  }
}