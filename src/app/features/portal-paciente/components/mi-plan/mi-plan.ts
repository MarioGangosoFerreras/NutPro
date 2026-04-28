import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonCard, IonCardContent, IonIcon, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { PlanNutricionalService } from '../../../../core/services/plan-nutricional';
import { addIcons } from 'ionicons';
import { flameOutline } from 'ionicons/icons';
import { MenuSemanalComponent } from '../../../pacientes/ficha-paciente/tabs/tab-plan/components/menu-semanal/menu-semanal';

@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [CommonModule, IonContent, IonCard, IonCardContent, IonIcon, IonBadge, IonSpinner, Header, MenuSemanalComponent],
  templateUrl: './mi-plan.html',
  styleUrls: ['./mi-plan.css']
})
export class MiPlan implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private planService = inject(PlanNutricionalService);

  paciente = signal<any>(null);
  planActivo = signal<any>(null);
  cargando = signal(true);

  constructor() { addIcons({ flameOutline }); }

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario) {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
        if (perfil) {
          const plan = await this.planService.getPlanActivo(perfil.id);
          this.planActivo.set(plan);
        }
      }
    } finally {
      this.cargando.set(false);
    }
  }
}