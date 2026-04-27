import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  IonBadge,
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
} from 'ionicons/icons';
import { RecetaService, Receta } from '../../../../core/services/receta';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-detalle-receta',
  templateUrl: './detalle-receta.html',
  styleUrls: ['./detalle-receta.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
    IonBadge,
  ],
})
export class DetalleReceta implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recetaService = inject(RecetaService);
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  receta = signal<Receta | null>(null);
  miUsuarioId = signal<string>(''); // Almacenará el UUID de Auth
  cargando = signal(true);
  error = signal<string | null>(null);

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
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // IMPORTANTE: Usamos getUserId() para obtener el UUID de Auth
    this.miUsuarioId.set(await this.authService.getUserId());

    if (!id) {
      this.router.navigate(['/alimentacion/recetas']);
      return;
    }
    await this.cargarReceta(id);
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
    const receta = this.receta();
    if (!receta) return;

    const esPublica = receta.visibilidad === 'publica';
    const alert = await this.alertCtrl.create({
      header: esPublica ? 'Ocultar receta' : 'Eliminar receta',
      message: esPublica
        ? 'Esta receta es pública. Se ocultará de tu lista pero seguirá disponible para otros.'
        : '¿Estás seguro de eliminar esta receta privada? No se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: esPublica ? 'Ocultar' : 'Eliminar',
          role: 'destructive',
          handler: () =>
            esPublica ? this.ocultarReceta(receta.id) : this.eliminarReceta(receta.id),
        },
      ],
    });
    await alert.present();
  }

  private async ocultarReceta(id: string) {
    const loading = await this.loadingCtrl.create({ message: 'Ocultando...', spinner: 'crescent' });
    await loading.present();
    try {
      await this.recetaService.ocultarReceta(id, this.miUsuarioId());
      await loading.dismiss();
      this.router.navigate(['/alimentacion/recetas']);
    } catch {
      await loading.dismiss();
      this.mostrarToast('Error al ocultar', 'danger');
    }
  }

  private async eliminarReceta(id: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Eliminando...',
      spinner: 'crescent',
    });
    await loading.present();
    try {
      await this.recetaService.eliminarReceta(id);
      await loading.dismiss();
      this.router.navigate(['/alimentacion/recetas']);
    } catch {
      await loading.dismiss();
      this.mostrarToast('Error al eliminar', 'danger');
    }
  }

  volver() {
    this.router.navigate(['/alimentacion/recetas']);
  }

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
