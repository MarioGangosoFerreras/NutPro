import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonList,
  IonItem,
  IonBadge,
  IonButton,
  ToastController,
} from '@ionic/angular/standalone';
import { PlanConfiguradorComponent } from './components/plan-configurador/plan-configurador';
import { MenuSemanalComponent } from './components/menu-semanal/menu-semanal';
import { PlanNutricionalService } from '../../../../../core/services/plan-nutricional';
import { addIcons } from 'ionicons';
import { copyOutline, calendarOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab-plan',
  standalone: true,
  imports: [
    CommonModule,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    FormsModule,
    IonList,
    IonItem,
    IonBadge,
    IonButton,
    IonIcon,
    PlanConfiguradorComponent,
    MenuSemanalComponent,
  ],
  templateUrl: './tab-plan.html',
})
export class TabPlan implements OnInit {
  @Input() paciente: any;
  vistaActiva: 'configuracion' | 'menu' | 'historial' = 'configuracion';

  planActivo: any = null;
  historialPlanes: any[] = [];
  historialMenus: any[] = [];

  private planService = inject(PlanNutricionalService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ copyOutline, calendarOutline });
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.planActivo = await this.planService.getPlanActivo(this.paciente.id);
    this.historialPlanes = await this.planService.getHistorialPlanes(this.paciente.id);
    this.historialMenus = await this.planService.getHistorialMenus(this.paciente.id);
    this.cdr.detectChanges();
  }

  onPlanGuardado(nuevoPlan: any) {
    this.planActivo = nuevoPlan;
    this.cargarDatos();
    this.vistaActiva = 'menu';
  }

  async clonarMenu(menuViejo: any) {
    if (!this.planActivo) {
      const toast = await this.toastCtrl.create({
        message: 'Primero debes tener un plan activo configurado.',
        duration: 2500,
        color: 'warning',
      });
      toast.present();
      return;
    }

    const menuActual = await this.planService.getOrCreateMenuParaPlan(
      this.planActivo.id,
      this.paciente.id,
    );

    if (menuActual.id === menuViejo.id) {
      const toast = await this.toastCtrl.create({
        message: 'Ese ya es el menú actual de esta semana.',
        duration: 2500,
        color: 'warning',
      });
      toast.present();
      return;
    }

    try {
      await this.planService.copiarEntradasMenu(menuViejo.id, menuActual.id);
      const toast = await this.toastCtrl.create({
        message: 'Menú reutilizado con éxito',
        duration: 2500,
        color: 'success',
      });
      toast.present();

      // Forzamos a recargar la pestaña de menú para que vea el nuevo menú clonado
      this.vistaActiva = 'configuracion';
      setTimeout(() => {
        this.vistaActiva = 'menu';
        this.cdr.detectChanges();
      }, 10);
    } catch (e) {
      const toast = await this.toastCtrl.create({
        message: 'Error al copiar el menú',
        duration: 2500,
        color: 'danger',
      });
      toast.present();
    }
  }
}
