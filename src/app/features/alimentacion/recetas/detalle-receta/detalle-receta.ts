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

/**
 * Componente que muestra el detalle completo de una receta seleccionada.
 * Permite visualizar su información nutricional, ingredientes, elaboración, 
 * así como gestionar acciones como editar, ocultar o eliminar la receta.
 * * @export
 * @class DetalleReceta
 * @implements {OnInit}
 */
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

  /** Señal reactiva que contiene los datos de la receta actual cargada */
  receta = signal<Receta | null>(null);
  
  /** Señal reactiva que almacena el UUID del usuario autenticado actualmente */
  miUsuarioId = signal<string>(''); // Almacenará el UUID de Auth
  
  /** Señal reactiva que indica si la información principal se está cargando */
  cargando = signal(true);
  error = signal<string | null>(null);

  /**
   * Valor computado que calcula dinámicamente los macronutrientes por ración 
   * en función de los macronutrientes totales de la receta y el número de raciones.
   * * @type {Signal<{ calorias: number; proteina: number; carbohidratos: number; grasa: number; } | null>}
   */
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

  /**
   * Crea una instancia de DetalleReceta y registra los iconos de Ionic utilizados en el template.
   */
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

  /**
   * Método del ciclo de vida de Angular. Se ejecuta al inicializar el componente.
   * Obtiene el ID del usuario, recupera el ID de la receta de los parámetros 
   * de la URL y ejecuta la carga de datos.
   * * @returns {Promise<void>}
   */
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

  /**
   * Carga los datos de una receta específica desde la base de datos a través del servicio.
   * Actualiza los estados de carga y error correspondientes.
   * * @private
   * @param {string} id - El identificador único de la receta a cargar.
   * @returns {Promise<void>}
   */
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

  /**
   * Muestra un diálogo de confirmación antes de eliminar u ocultar una receta.
   * Si la receta es pública, ofrece la opción de ocultarla de la lista del usuario.
   * Si es privada, ofrece la opción de eliminarla permanentemente.
   * * @returns {Promise<void>}
   */
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

  /**
   * Oculta una receta pública para que no aparezca en la lista personal del usuario.
   * Redirige al listado tras finalizar la operación.
   * * @private
   * @param {string} id - El identificador de la receta a ocultar.
   * @returns {Promise<void>}
   */
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

  /**
   * Elimina de forma permanente una receta privada de la base de datos.
   * Redirige al listado tras finalizar la operación con éxito.
   * * @private
   * @param {string} id - El identificador de la receta a eliminar.
   * @returns {Promise<void>}
   */
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

  /**
   * Navega de vuelta a la lista general de recetas.
   * * @returns {void}
   */
  volver() {
    this.router.navigate(['/alimentacion/recetas']);
  }

  /**
   * Calcula el valor de un macronutriente en función de los gramos del ingrediente aportado.
   * * @param {number} macro - Cantidad del macronutriente base por cada 100g.
   * @param {number} cantidad_g - Cantidad del ingrediente utilizado en gramos.
   * @returns {number} Valor calculado del macronutriente redondeado a un decimal.
   */
  calcularMacrosIngrediente(macro: number, cantidad_g: number): number {
    return Math.round(((macro * cantidad_g) / 100) * 10) / 10;
  }

  /**
   * Muestra un mensaje emergente (Toast) en la parte inferior de la pantalla.
   * * @private
   * @param {string} message - El mensaje de texto a mostrar.
   * @param {string} color - El color semántico del toast (ej. 'success', 'danger').
   * @returns {Promise<void>}
   */
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