import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem, IonBadge } from '@ionic/angular/standalone';
import { PlanConfiguradorComponent } from './components/plan-configurador/plan-configurador';
import { MenuSemanalComponent } from './components/menu-semanal/menu-semanal';
import { PlanNutricionalService } from '../../../../../core/services/plan-nutricional';

@Component({
  selector: 'app-tab-plan',
  standalone: true,
  imports: [CommonModule, IonSegment, IonSegmentButton, IonLabel, FormsModule, IonList, IonItem, IonBadge, PlanConfiguradorComponent, MenuSemanalComponent],
  templateUrl: './tab-plan.html',
})
export class TabPlan implements OnInit {
  @Input() paciente: any;
  vistaActiva: 'configuracion' | 'menu' | 'historial' = 'configuracion';
  
  planActivo: any = null;
  historialPlanes: any[] = [];

  private planService = inject(PlanNutricionalService);

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.planActivo = await this.planService.getPlanActivo(this.paciente.id);
    this.historialPlanes = await this.planService.getHistorialPlanes(this.paciente.id);
  }

  onPlanGuardado(nuevoPlan: any) {
    this.planActivo = nuevoPlan;
    this.cargarDatos();
    this.vistaActiva = 'menu'; // Redirige al menú automáticamente tras guardar
  }

  async restaurarPlan(planViejo: any) {
    // Lógica opcional para convertir un plan antiguo en el activo actual
    await this.planService.upsertPlan(this.paciente.id, planViejo);
    await this.cargarDatos();
    this.vistaActiva = 'configuracion';
  }
}