import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { TabMediciones } from '../../../pacientes/ficha-paciente/tabs/tab-mediciones/tab-mediciones';

@Component({
  selector: 'app-mi-evolucion',
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner, IonIcon, Header, TabMediciones],
  templateUrl: './mi-evolucion.html',
  styleUrls: ['./mi-evolucion.css']
})
export class MiEvolucion implements OnInit {
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