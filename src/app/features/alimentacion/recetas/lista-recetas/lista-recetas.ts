import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSearchbar, IonChip, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonBadge, IonSkeletonText, IonItem,
  IonRefresher, IonRefresherContent, IonFab, IonFabButton,
  IonSegment, IonSegmentButton, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trashOutline, eyeOutline, timeOutline, restaurantOutline, lockClosedOutline, globeOutline } from 'ionicons/icons';
import { Receta, RecetaService } from '../../../../core/services/receta';

@Component({
  selector: 'app-lista-recetas',
  templateUrl: './lista-recetas.html',
  styleUrls: ['./lista-recetas.css'],
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonSearchbar, IonChip, IonLabel,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonBadge, IonSkeletonText, IonItem,
    IonRefresher, IonRefresherContent, IonFab, IonFabButton,
    IonSegment, IonSegmentButton
  ]
})
export class ListaRecetasPage implements OnInit {
  private recetaService = inject(RecetaService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  recetas = signal<Receta[]>([]);
  recetasFiltradas = signal<Receta[]>([]);
  cargando = signal(true);
  filtroActivo = signal('todas');
  busqueda = signal('');

  readonly filtros = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'desayuno', label: 'Desayuno' },
    { valor: 'almuerzo', label: 'Almuerzo' },
    { valor: 'comida', label: 'Comida' },
    { valor: 'merienda', label: 'Merienda' },
    { valor: 'cena', label: 'Cena' },
    { valor: 'snack', label: 'Snack' },
  ];

  constructor() {
    addIcons({ add, trashOutline, eyeOutline, timeOutline, restaurantOutline, lockClosedOutline, globeOutline });
  }

  async ngOnInit() {
    await this.cargarRecetas();
  }

  async cargarRecetas() {
    try {
      this.cargando.set(true);
      const data = await this.recetaService.getRecetas();
      this.recetas.set(data);
      this.aplicarFiltros();
    } catch (e) {
      await this.mostrarToast('Error cargando recetas', 'danger');
    } finally {
      this.cargando.set(false);
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

    // Filtro por tipo de comida
    if (this.filtroActivo() !== 'todas') {
      resultado = resultado.filter(r =>
        r.tipo_comida?.includes(this.filtroActivo())
      );
    }

    // Filtro por búsqueda de texto
    if (this.busqueda()) {
      resultado = resultado.filter(r =>
        r.nombre.toLowerCase().includes(this.busqueda())
      );
    }

    this.recetasFiltradas.set(resultado);
  }

  async confirmarEliminar(receta: Receta) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar receta',
      message: `¿Seguro que quieres eliminar "${receta.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarReceta(receta.id)
        }
      ]
    });
    await alert.present();
  }

  async eliminarReceta(id: string) {
    try {
      await this.recetaService.eliminarReceta(id);
      this.recetas.update(rs => rs.filter(r => r.id !== id));
      this.aplicarFiltros();
      await this.mostrarToast('Receta eliminada', 'success');
    } catch {
      await this.mostrarToast('Error al eliminar', 'danger');
    }
  }

  // Helpers para la UI
  getSkeletons() { return Array(4); }

  getMacrosPorRacion(receta: Receta) {
    return {
      kcal: Math.round(receta.calorias_kcal / receta.raciones),
      prot: Math.round(receta.proteina_g / receta.raciones),
      carbs: Math.round(receta.carbohidratos_g / receta.raciones),
      grasa: Math.round(receta.grasa_g / receta.raciones),
    };
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}