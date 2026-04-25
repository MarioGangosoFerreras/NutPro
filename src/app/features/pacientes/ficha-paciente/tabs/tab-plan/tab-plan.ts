import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importar ChangeDetectorRef
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
  private cdr = inject(ChangeDetectorRef); // <-- 2. Inyectar ChangeDetectorRef

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.planActivo = await this.planService.getPlanActivo(this.paciente.id);
    this.historialPlanes = await this.planService.getHistorialPlanes(this.paciente.id);
    
    this.cdr.detectChanges(); // <-- 3. Avisar a Angular que los datos han cambiado
  }

  onPlanGuardado(nuevoPlan: any) {
    this.planActivo = nuevoPlan;
    this.cargarDatos();
    this.vistaActiva = 'menu';
  }

  async restaurarPlan(planViejo: any) {
    await this.planService.upsertPlan(this.paciente.id, planViejo);
    await this.cargarDatos();
    this.vistaActiva = 'configuracion';
  }
}