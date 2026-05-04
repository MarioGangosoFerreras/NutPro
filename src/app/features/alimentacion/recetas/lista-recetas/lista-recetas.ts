import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonLabel,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  ToastController,
  AlertController,
  MenuController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  trashOutline,
  eyeOutline,
  timeOutline,
  restaurantOutline,
  lockClosedOutline,
  globeOutline,
  eyeOffOutline,
  refreshOutline,
} from 'ionicons/icons';
import { Receta, RecetaService } from '../../../../core/services/receta';
import { AuthService } from '../../../../core/services/auth';
import { Header } from '../../../../shared/components/header/header';
import { Shell } from '../../../../shared/components/shell/shell';

/**
 * Componente que muestra el listado de recetas, permitiendo al usuario
 * buscar, filtrar por tipo de comida y realizar acciones como ver detalle, 
 * editar, ocultar o eliminar permanentemente las recetas.
 * * @export
 * @class ListaRecetas
 * @implements {ViewWillEnter}
 */
@Component({
  selector: 'app-lista-recetas',
  templateUrl: './lista-recetas.html',
  styleUrls: ['./lista-recetas.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonLabel,
    IonCard,
    IonCardTitle,
    IonCardSubtitle,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    Header,
  ],
})
export class ListaRecetas implements ViewWillEnter {
  private recetaService = inject(RecetaService);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);

  // Estados de carga y datos
  /** Señal reactiva que contiene todas las recetas activas/visibles */
  recetas = signal<Receta[]>([]);
  /** Señal reactiva que contiene las recetas después de aplicar búsqueda y filtros */
  recetasFiltradas = signal<Receta[]>([]);
  /** Señal reactiva que contiene las recetas que el usuario ha decidido ocultar */
  recetasOcultas = signal<Receta[]>([]);
  /** Señal reactiva que indica si la vista está en estado de carga */
  cargando = signal(true);

  // Filtros y UI
  /** Señal reactiva con el valor del filtro de tipo de comida actualmente activo */
  filtroActivo = signal('todas');
  /** Señal reactiva que almacena el texto introducido en la barra de búsqueda */
  busqueda = signal('');
  /** Señal reactiva que controla la visibilidad de la sección de recetas ocultas */
  verOcultas = signal(false);
  
  /** Identificador (UUID) del usuario autenticado actualmente */
  miUsuarioId = '';
  /** Versión o identificador para uso misceláneo (por ejemplo cache) */
  version = 0;

  /** Opciones de filtrado disponibles en la interfaz (segmentos) */
  readonly filtros = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'desayuno', label: 'Desayuno' },
    { valor: 'comida', label: 'Comida' },
    { valor: 'cena', label: 'Cena' },
    { valor: 'snack', label: 'Snacks' },
  ];

  /**
   * Crea una instancia de ListaRecetas y registra los iconos utilizados en el componente.
   */
  constructor() {
    addIcons({
      add,
      trashOutline,
      eyeOutline,
      timeOutline,
      restaurantOutline,
      lockClosedOutline,
      globeOutline,
      eyeOffOutline,
      refreshOutline,
    });
  }

  /**
   * Método del ciclo de vida de Ionic que se ejecuta antes de que la vista entre en transición.
   * Inicializa la carga de las recetas.
   * * @returns {Promise<void>}
   */
  async ionViewWillEnter() {
    await this.cargarRecetas();
  }

  /**
   * Obtiene el estado de colapso del menú lateral desde el componente Shell.
   * * @readonly
   * @type {boolean}
   */
  get collapsed() {
    return Shell.isCollapsed();
  }

  /**
   * Alterna el estado del menú lateral (colapsado/expandido) dependiendo del ancho de la ventana.
   * * @returns {void}
   */
  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  /**
   * Carga desde la base de datos la lista general de recetas y la lista de IDs ocultos
   * por el usuario actual, para luego separarlas en sus respectivas señales.
   * * @returns {Promise<void>}
   */
  async cargarRecetas() {
    try {
      this.cargando.set(true);
      this.miUsuarioId = await this.authService.getUserId();

      // Cargamos todas las recetas y la lista de IDs ocultos en paralelo
      const [todas, idsOcultos] = await Promise.all([
        this.recetaService.getRecetas(),
        this.recetaService.getIdsRecetasOcultas(this.miUsuarioId),
        new Promise((resolve) => setTimeout(resolve, 600)), // Delay visual mínimo
      ]);

      // Separamos las recetas visibles de las ocultas basándonos en la tabla de relación
      this.recetas.set(todas.filter((r) => !idsOcultos.includes(r.id)));
      this.recetasOcultas.set(todas.filter((r) => idsOcultos.includes(r.id)));

      this.aplicarFiltros();
    } catch (e) {
      await this.mostrarToast('Error cargando recetas', 'danger');
    } finally {
      this.cargando.set(false);
      this.cdr.detectChanges();
    }
  }

  /**
   * Manejador del evento "pull to refresh". Recarga la lista de recetas y notifica al componente nativo al terminar.
   * * @param {*} event - Objeto del evento emitido por el `ion-refresher`.
   * @returns {Promise<void>}
   */
  async onRefresh(event: any) {
    await this.cargarRecetas();
    event.target.complete();
  }

  /**
   * Maneja el cambio de valor en la barra de búsqueda y aplica los filtros actualizados.
   * * @param {*} event - Objeto del evento emitido por el `ion-searchbar`.
   * @returns {void}
   */
  onBusqueda(event: any) {
    this.busqueda.set(event.detail.value?.toLowerCase() ?? '');
    this.aplicarFiltros();
  }

  /**
   * Maneja el cambio de filtro en los segmentos de tipos de comida y aplica los filtros actualizados.
   * * @param {*} event - Objeto del evento emitido por el `ion-segment`.
   * @returns {void}
   */
  onFiltro(event: any) {
    this.filtroActivo.set(event.detail.value);
    this.aplicarFiltros();
  }

  /**
   * Aplica la lógica de filtrado sobre las recetas basándose tanto en la búsqueda de texto
   * como en la pestaña de tipo de comida activa. Actualiza la señal `recetasFiltradas`.
   * * @returns {void}
   */
  aplicarFiltros() {
    let resultado = this.recetas();

    if (this.filtroActivo() !== 'todas') {
      resultado = resultado.filter((r) => r.tipo_comida?.includes(this.filtroActivo()));
    }

    if (this.busqueda()) {
      resultado = resultado.filter((r) => r.nombre.toLowerCase().includes(this.busqueda()));
    }

    this.recetasFiltradas.set(resultado);
  }

  /**
   * Determina si la receta se borra definitivamente de la base de datos (privada)
   * o si solamente se oculta del listado personal del usuario (pública).
   * Muestra un diálogo de confirmación para procesar la acción.
   * * @param {Receta} receta - Objeto de la receta a procesar.
   * @returns {Promise<void>}
   */
  async gestionarAccionEliminar(receta: Receta) {
    const esPublica = receta.visibilidad === 'publica';
    const titulo = esPublica ? 'Ocultar receta' : 'Eliminar receta';
    const mensaje = esPublica
      ? 'Esta receta es pública. No se puede borrar de la base de datos global, pero puedes ocultarla de tu lista personal.'
      : `¿Seguro que quieres eliminar "${receta.nombre}"? Esta acción no se puede deshacer.`;

    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: esPublica ? 'Ocultar' : 'Eliminar',
          role: 'destructive',
          handler: () => (esPublica ? this.ocultar(receta.id) : this.eliminarReceta(receta.id)),
        },
      ],
    });
    await alert.present();
  }

  /**
   * Oculta una receta para que no aparezca en el listado visible del usuario activo
   * guardando dicha preferencia en base de datos. Recarga la lista tras realizar la acción.
   * * @param {string} id - Identificador de la receta.
   * @returns {Promise<void>}
   */
  async ocultar(id: string) {
    try {
      await this.recetaService.ocultarReceta(id, this.miUsuarioId);
      await this.cargarRecetas();
      await this.mostrarToast('Receta ocultada con éxito', 'success');
    } catch {
      await this.mostrarToast('Error al ocultar la receta', 'danger');
    }
  }

  /**
   * Restaura la visibilidad de una receta previamente oculta por el usuario.
   * Recarga la lista una vez terminada la petición.
   * * @param {string} id - Identificador de la receta a restaurar.
   * @returns {Promise<void>}
   */
  async desocultar(id: string) {
    try {
      await this.recetaService.desocultarReceta(id, this.miUsuarioId);
      await this.cargarRecetas();
      await this.mostrarToast('Receta restaurada', 'success');
    } catch {
      await this.mostrarToast('Error al restaurar', 'danger');
    }
  }

  /**
   * Elimina completamente la receta seleccionada de la base de datos.
   * * @param {string} id - Identificador de la receta a eliminar.
   * @returns {Promise<void>}
   */
  async eliminarReceta(id: string) {
    try {
      await this.recetaService.eliminarReceta(id);
      await this.cargarRecetas();
      await this.mostrarToast('Receta eliminada permanentemente', 'success');
    } catch {
      await this.mostrarToast('Error al eliminar', 'danger');
    }
  }

  /**
   * Calcula y devuelve los macronutrientes correspondientes a una ración de la receta especificada.
   * * @param {Receta} receta - La receta de la cual calcular los macros.
   * @returns {{ kcal: number; prot: number; carbs: number; grasa: number; }} Un objeto con los macros divididos por el total de raciones.
   */
  getMacrosPorRacion(receta: Receta) {
    const r = receta.raciones || 1;
    return {
      kcal: Math.round(receta.calorias_kcal / r),
      prot: Math.round(receta.proteina_g / r),
      carbs: Math.round(receta.carbohidratos_g / r),
      grasa: Math.round(receta.grasa_g / r),
    };
  }

  /**
   * Muestra un mensaje emergente en la parte inferior de la pantalla.
   * * @private
   * @param {string} message - Texto de la notificación.
   * @param {string} color - Color temático de la notificación.
   * @returns {Promise<void>}
   */
  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}