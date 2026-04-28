import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonAvatar, IonItem, IonLabel, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/services/auth';
import { PacientesService } from '../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { personCircleOutline, mailOutline, callOutline, chatbubblesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-portal-paciente',
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonAvatar, IonItem, IonLabel, IonIcon, IonButton, IonSpinner, Header],
  templateUrl: './portal-paciente.html',
  styleUrls: ['./portal-paciente.css']
})
export class PortalPaciente implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);

  paciente = signal<any>(null);
  nutricionista = signal<any>(null);
  cargando = signal(true);

  constructor() {
    addIcons({ personCircleOutline, mailOutline, callOutline, chatbubblesOutline });
  }

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario && usuario.rol === 'paciente') {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
        this.nutricionista.set(perfil?.nutricionista);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.cargando.set(false);
    }
  }
}