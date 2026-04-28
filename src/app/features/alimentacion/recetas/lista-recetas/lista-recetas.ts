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
  recetas = signal<Receta[]>([]);
  recetasFiltradas = signal<Receta[]>([]);
  recetasOcultas = signal<Receta[]>([]);
  cargando = signal(true);

  // Filtros y UI
  filtroActivo = signal('todas');
  busqueda = signal('');
  verOcultas = signal(false);
  miUsuarioId = '';
  version = 0;

  readonly filtros = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'desayuno', label: 'Desayuno' },
    { valor: 'comida', label: 'Comida' },
    { valor: 'cena', label: 'Cena' },
    { valor: 'snack', label: 'Snacks' },
  ];

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

  async ionViewWillEnter() {
    await this.cargarRecetas();
  }

  get collapsed() {
    return Shell.isCollapsed();
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

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

  async onRefresh(event: any) {
    await this.cargarRecetas();
    event.target.complete();
  }

  onBusqueda(event: any) {
    this.busqueda.set(event.detail.value?.toLowerCase() ?? '');
    this.aplicarFiltros();
  }

  onFiltro(event: any) {
    this.filtroActivo.set(event.detail.value);
    this.aplicarFiltros();
  }

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
   * Determina si la receta se borra (privada) o se oculta (pública)
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

  async ocultar(id: string) {
    try {
      await this.recetaService.ocultarReceta(id, this.miUsuarioId);
      await this.cargarRecetas();
      await this.mostrarToast('Receta ocultada con éxito', 'success');
    } catch {
      await this.mostrarToast('Error al ocultar la receta', 'danger');
    }
  }

  async desocultar(id: string) {
    try {
      await this.recetaService.desocultarReceta(id, this.miUsuarioId);
      await this.cargarRecetas();
      await this.mostrarToast('Receta restaurada', 'success');
    } catch {
      await this.mostrarToast('Error al restaurar', 'danger');
    }
  }

  async eliminarReceta(id: string) {
    try {
      await this.recetaService.eliminarReceta(id);
      await this.cargarRecetas();
      await this.mostrarToast('Receta eliminada permanentemente', 'success');
    } catch {
      await this.mostrarToast('Error al eliminar', 'danger');
    }
  }

  getMacrosPorRacion(receta: Receta) {
    const r = receta.raciones || 1;
    return {
      kcal: Math.round(receta.calorias_kcal / r),
      prot: Math.round(receta.proteina_g / r),
      carbs: Math.round(receta.carbohidratos_g / r),
      grasa: Math.round(receta.grasa_g / r),
    };
  }

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
