import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonBadge,
  IonItem,
  IonList,
  IonNote,
  IonAlert,
  AlertController,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  trashOutline,
  createOutline,
  timeOutline,
  restaurantOutline,
  peopleOutline,
  nutritionOutline,
  checkmarkCircleOutline,
  ellipsisVerticalOutline,
} from 'ionicons/icons';
import { RecetaService, Receta } from '../../../../core/services/receta';

@Component({
  selector: 'app-detalle-receta',
  templateUrl: './detalle-receta.html',
  styleUrls: ['./detalle-receta.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonSpinner,
    IonBadge,
  ],
})
export class DetalleReceta implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recetaService = inject(RecetaService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  receta = signal<Receta | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Macros por ración calculados
  macrosPorRacion = computed(() => {
    const r = this.receta();
    if (!r) return null;
    const raciones = r.raciones || 1;
    return {
      calorias: Math.round(r.calorias_kcal / raciones),
      proteina: Math.round((r.proteina_g / raciones) * 10) / 10,
      carbohidratos: Math.round((r.carbohidratos_g / raciones) * 10) / 10,
      grasa: Math.round((r.grasa_g / raciones) * 10) / 10,
    };
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      trashOutline,
      createOutline,
      timeOutline,
      restaurantOutline,
      peopleOutline,
      nutritionOutline,
      checkmarkCircleOutline,
      ellipsisVerticalOutline,
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/alimentacion/recetas']);
      return;
    }
    await this.cargarReceta(id);
  }

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !this.receta()) {
      await this.cargarReceta(id);
    }
  }

  private async cargarReceta(id: string) {
    try {
      this.cargando.set(true);
      this.error.set(null);
      const receta = await this.recetaService.getRecetaById(id);
      this.receta.set(receta);
    } catch (e) {
      this.error.set('No se pudo cargar la receta');
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmarEliminar() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar receta',
      message:
        '¿Estás seguro de que quieres eliminar esta receta? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarReceta(),
        },
      ],
    });
    await alert.present();
  }

  private async eliminarReceta() {
    const id = this.receta()?.id;
    if (!id) return;

    const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
    await loading.present();

    try {
      await this.recetaService.eliminarReceta(id);
      await loading.dismiss();
      await this.mostrarToast('Receta eliminada', 'success');
      this.router.navigate(['/alimentacion/recetas']);
    } catch {
      await loading.dismiss();
      await this.mostrarToast('Error al eliminar la receta', 'danger');
    }
  }

  volver() {
    this.router.navigate(['/alimentacion/recetas']);
  }

  // Calcula macros de un ingrediente según cantidad
  calcularMacrosIngrediente(macro: number, cantidad_g: number): number {
    return Math.round(((macro * cantidad_g) / 100) * 10) / 10;
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
