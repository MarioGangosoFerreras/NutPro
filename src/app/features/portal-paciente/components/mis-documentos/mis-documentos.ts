import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { TabDocumentos } from '../../../pacientes/ficha-paciente/tabs/tab-documentos/tab-documentos';

@Component({
  selector: 'app-mis-documentos',
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner, IonIcon, Header, TabDocumentos],
  template: `
    <app-header titulo="Docs y Facturas"></app-header>

    <ion-content class="ion-padding" color="light">
      @if (cargando()) {
        <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
          <div class="avocado-spinner">🥑</div>
          <p style="color: #2d6a4f; font-weight: 600; margin-top: 10px">Cargando documentos...</p>
        </div>
      } @else if (paciente()) {
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="margin-bottom: 24px; padding: 5px;">
            <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px;">Tus documentos</h2>
            <p style="color: #64748b; margin: 4px 0 0; font-size: 15px;">Sube tus analíticas o descarga tus facturas.</p>
          </div>
          
          <div style="background: white; border-radius: 20px; padding: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
            <app-tab-documentos 
              [paciente]="paciente()" 
              [esPaciente]="true">
            </app-tab-documentos>
          </div>
        </div>
      }
    </ion-content>
  `
})
export class MisDocumentos implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);

  paciente = signal<any>(null);
  cargando = signal(true);

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario && usuario.rol === 'paciente') {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
      }
    } finally {
      this.cargando.set(false);
    }
  }
}