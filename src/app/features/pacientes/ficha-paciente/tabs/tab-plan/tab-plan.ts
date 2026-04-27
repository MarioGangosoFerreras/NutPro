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
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonSpinner,
  IonContent,
} from '@ionic/angular/standalone';
import { PlanConfiguradorComponent } from './components/plan-configurador/plan-configurador';
import { MenuSemanalComponent } from './components/menu-semanal/menu-semanal';
import { PlanNutricionalService } from '../../../../../core/services/plan-nutricional';
import { addIcons } from 'ionicons';
import {
  copyOutline,
  calendarOutline,
  eyeOutline,
  closeOutline,
  restaurantOutline,
} from 'ionicons/icons';

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
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonSpinner,
    IonContent,
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

  // Variables para la Vista Previa del Menú
  modalPreviewAbierto = false;
  cargandoPreview = false;
  menuPreview: any = null;
  entradasPreview: any[] = [];

  dias = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 7, nombre: 'Domingo' },
  ];

  tiposComida = [
    { id: 'desayuno', label: 'Desayuno' },
    { id: 'comida', label: 'Comida' },
    { id: 'snack', label: 'Snacks' },
    { id: 'cena', label: 'Cena' },
  ];

  private planService = inject(PlanNutricionalService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ copyOutline, calendarOutline, eyeOutline, closeOutline, restaurantOutline });
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

  // --- MÉTODOS DE VISTA PREVIA ---
  async abrirPreview(menu: any) {
    this.menuPreview = menu;
    this.modalPreviewAbierto = true;
    this.cargandoPreview = true;
    this.cdr.detectChanges();
    try {
      this.entradasPreview = await this.planService.getEntradasMenu(menu.id);
    } catch (e) {
      console.error('Error cargando preview:', e);
    } finally {
      this.cargandoPreview = false;
      this.cdr.detectChanges();
    }
  }

  cerrarPreview() {
    this.modalPreviewAbierto = false;
    this.menuPreview = null;
    this.entradasPreview = [];
  }

  obtenerEntradasPreview(diaId: number, tipoComida: string) {
    return this.entradasPreview.filter(
      (e) => e.dia_semana === diaId && e.tipo_comida === tipoComida,
    );
  }

  // --- MÉTODOS DE CLONACIÓN ---
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

      // Cerramos modal por si se clonó desde la vista previa
      this.cerrarPreview();

      // Forzamos a recargar la pestaña de menú
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
