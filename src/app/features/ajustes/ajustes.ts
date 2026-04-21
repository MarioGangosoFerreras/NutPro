import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonItem, IonLabel, IonButton, IonIcon, IonButtons, ViewWillEnter
} from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, checkmarkCircle } from 'ionicons/icons';
import { Shell } from '../../shared/components/shell/shell';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle,
            IonItem, IonLabel, IonButton, IonIcon, IonButtons],
  templateUrl: './ajustes.html',
})
export class AjustesPage implements ViewWillEnter {
  private gcalService = inject(GoogleCalendarService);
  private cdr = inject(ChangeDetectorRef);
  private menuCtrl = inject(MenuController);
  conectado = false;

  constructor() { addIcons({ logoGoogle, checkmarkCircle }); }

  get collapsed() {
    return Shell.isCollapsed();
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  async ionViewWillEnter() {
    this.conectado = await this.gcalService.estaConectado();
    this.cdr.detectChanges();
  }

  async toggleConexion() {
    if (this.conectado) {
      await this.gcalService.desconectar();
      this.conectado = false;
    } else {
      this.gcalService.iniciarOAuth();
    }
    this.cdr.detectChanges();
  }
}