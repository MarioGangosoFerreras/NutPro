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

/**
 * Componente "Wrapper" que organiza en forma de tabs/segmentos lógicos
 * todo el entorno que rodea a la dieta: el calculador, el menú actual
 * y una hemeroteca de menús antiguos o pasados para previsualización o clonación.
 *
 * @export
 * @class TabPlan
 * @implements {OnInit}
 */
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
  /** Paciente raíz del que dependemos mediante un scope superior. */
  @Input() paciente: any;

  /** Estado de iteración Ionic del IonSegment UI. */
  vistaActiva: 'configuracion' | 'menu' | 'historial' = 'configuracion';

  planActivo: any = null;
  historialPlanes: any[] = [];
  historialMenus: any[] = [];

  // Variables para la Vista Previa del Menú
  modalPreviewAbierto = false;
  cargandoPreview = false;
  menuPreview: any = null;
  entradasPreview: any[] = [];

  /** Configuración array interior que subdivide horizontalmente los generadores. */
  dias = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 7, nombre: 'Domingo' },
  ];

  /** Configuración array interior que subdivide verticalmente. */
  tiposComida = [
    { id: 'desayuno', label: 'Desayuno' },
    { id: 'comida', label: 'Comida' },
    { id: 'snack', label: 'Snacks' },
    { id: 'cena', label: 'Cena' },
  ];

  private planService = inject(PlanNutricionalService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  /** Configura visualmente los vectores gráficos incorporándolos a memoria ionic global local. */
  constructor() {
    addIcons({ copyOutline, calendarOutline, eyeOutline, closeOutline, restaurantOutline });
  }

  /**
   * Al ser desplegado o enfocado, se auto-refresca disparando asíncronamente
   * la obtención de todos los menús, y planificaciones de su historia activa y desactiva.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarDatos();
  }

  /**
   * Llama de forma asincrónica individual a los distintos endpoints/consultas de supabase y 
   * puebla en memoria todas sus entidades de visualización.
   *
   * @returns {Promise<void>}
   */
  async cargarDatos() {
    this.planActivo = await this.planService.getPlanActivo(this.paciente.id);
    this.historialPlanes = await this.planService.getHistorialPlanes(this.paciente.id);
    this.historialMenus = await this.planService.getHistorialMenus(this.paciente.id);
    this.cdr.detectChanges();
  }

  /**
   * Emisión desencadenada desde su hijo el `PlanConfigurador` cuando finaliza exitosamente un Upsert,
   * asignando al instante al padre la nueva realidad forzando así a abrir la pestaña menú.
   *
   * @param {*} nuevoPlan - El nuevo JSON de datos guardado.
   */
  onPlanGuardado(nuevoPlan: any) {
    this.planActivo = nuevoPlan;
    this.cargarDatos();
    this.vistaActiva = 'menu';
  }

  // --- MÉTODOS DE VISTA PREVIA ---
  /**
   * Presenta una modalidad asíncrona superpuesta que hace una llamada extra 
   * descargando exclusivamente las recetas (entradasMenu) de aquel mes y año seleccionado para observarlo sin editar.
   *
   * @param {*} menu - Menú original seleccionado del HTML *ngFor historial.
   * @returns {Promise<void>}
   */
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

  /** Baja el telón y la variable boleana modal y limpia residuos cacheados locales de consulta para no inflar la memoria ni corromper futuras previsualizaciones. */
  cerrarPreview() {
    this.modalPreviewAbierto = false;
    this.menuPreview = null;
    this.entradasPreview = [];
  }

  /**
   * Deconstruye el previw extraído extrayéndole solo los platos que concuerdan 
   * al cruzar los for (día X y comida Y) en la visualización grid final modal de sólo lectura.
   *
   * @param {number} diaId - ID del L a D.
   * @param {string} tipoComida - Formato String 'comida' | 'desayuno'.
   * @returns {*} Variable de datos.
   */
  obtenerEntradasPreview(diaId: number, tipoComida: string) {
    return this.entradasPreview.filter(
      (e) => e.dia_semana === diaId && e.tipo_comida === tipoComida,
    );
  }

  // --- MÉTODOS DE CLONACIÓN ---
  /**
   * Funcionalidad vital donde el profesional ahorra tiempo al machacar las entradas del menú "reciente"
   * sobreponiendo iterativamente todas las antiguas copiadas al milímetro de otro menú en cuestión.
   * Requiere sí o sí que exista un target plan activo donde sobreescribir.
   *
   * @param {*} menuViejo - ID del registro del objeto general contenedor de las recetas a reutilizar.
   * @returns {Promise<void>}
   */
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