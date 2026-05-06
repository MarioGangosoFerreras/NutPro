import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonSearchbar,
  IonSpinner,
  IonList,
  IonNote,
  IonCheckbox,
  IonBadge,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  cameraOutline,
  cameraReverseOutline,
  checkmarkOutline,
  closeOutline,
  createOutline,
  imageOutline,
  nutritionOutline,
  removeOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
import { RecetaService } from '../../../../core/services/receta';
import { FoodItem, FoodService, IngredienteLocal } from '../../../../core/services/food';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { Header } from '../../../../shared/components/header/header';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Componente principal para la creación y edición de recetas.
 * Permite gestionar la información básica, etiquetas, imagen y los ingredientes
 * asociados a la receta, calculando dinámicamente los macronutrientes.
 */
@Component({
  selector: 'app-crear-receta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonChip,
    IonSearchbar,
    IonSpinner,
    IonList,
    IonNote,
    IonCheckbox,
    IonBadge,
    Header,
  ],
  templateUrl: './crear-receta.html',
  styleUrls: ['./crear-receta.css'],
})
export class CrearReceta {
  private recetaService = inject(RecetaService);
  private foodService = inject(FoodService);
  private cloudinaryService = inject(CloudinaryService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private route = inject(ActivatedRoute);
  private actionSheetCtrl = inject(ActionSheetController);

  router = inject(Router);

  // --- SEÑALES DE DATOS BÁSICOS DE LA RECETA ---
  nombre = signal('');
  instrucciones = signal('');
  raciones = signal(1);
  tiempo_prep_min = signal<number | null>(null);
  visibilidad = signal<'publica' | 'privada'>('privada');
  tiposComidaSeleccionados = signal<string[]>([]);
  etiquetasSeleccionadas = signal<string[]>([]);

  // --- SEÑALES DE IMAGEN ---
  imagenUrl = signal<string | null>(null);
  subiendoImagen = signal(false);
  /** Controla la visibilidad del diálogo de selección de fuente de imagen (solo web) */
  mostrarDialogoImagen = signal(false);

  // --- SEÑALES DE INGREDIENTES ---
  ingredientes = signal<IngredienteLocal[]>([]);

  // --- SEÑALES DE BÚSQUEDA DE ALIMENTOS ---
  resultadosBusqueda = signal<FoodItem[]>([]);
  buscando = signal(false);
  busquedaQuery = signal('');

  // --- SEÑALES DE SELECCIÓN Y CONFIGURACIÓN DE INGREDIENTE ---
  foodSeleccionado = signal<FoodItem | null>(null);
  cantidadGramos = signal(100);
  cantidadTexto = signal('');
  esOpcional = signal(false);

  // --- SEÑALES DE MODO MANUAL DE ALIMENTOS ---
  modoManual = signal(false);
  manualNombre = signal('');
  manualCalorias = signal(0);
  manualProteina = signal(0);
  manualCarbs = signal(0);
  manualGrasa = signal(0);
  manualFibra = signal(0);
  guardandoManual = signal(false);

  // --- SEÑALES DE ESTADO DEL COMPONENTE ---
  modoEdicion = signal(false);
  recetaId = signal<string | null>(null);
  cargandoDatos = signal(false);

  mostrarModalCamara = signal(false);
  private streamCamara: MediaStream | null = null;

  /** Opciones disponibles para clasificar la receta por tipo de comida */
  readonly tiposComida = ['desayuno', 'comida', 'cena', 'snack'];

  /** Etiquetas dietéticas disponibles para la receta */
  readonly etiquetas = [
    'sin_gluten',
    'sin_lactosa',
    'vegano',
    'vegetariano',
    'bajo_fodmap',
    'sin_azucar',
    'alto_proteico',
  ];

  /**
   * Calcula los macronutrientes y calorías totales de la receta
   * sumando los valores de todos los ingredientes añadidos según su cantidad.
   */
  macrosTotales = computed(() => {
    const lista = this.ingredientes();
    return {
      calorias: Math.round(
        lista.reduce((sum, i) => sum + (i.calorias_kcal * i.cantidad_g) / 100, 0),
      ),
      proteina:
        Math.round(lista.reduce((sum, i) => sum + (i.proteina_g * i.cantidad_g) / 100, 0) * 10) /
        10,
      carbohidratos:
        Math.round(
          lista.reduce((sum, i) => sum + (i.carbohidratos_g * i.cantidad_g) / 100, 0) * 10,
        ) / 10,
      grasa:
        Math.round(lista.reduce((sum, i) => sum + (i.grasa_g * i.cantidad_g) / 100, 0) * 10) / 10,
      fibra:
        Math.round(lista.reduce((sum, i) => sum + (i.fibra_g * i.cantidad_g) / 100, 0) * 10) / 10,
    };
  });

  /**
   * Calcula los macronutrientes y calorías por ración,
   * dividiendo los macros totales entre el número de raciones especificadas.
   */
  macrosPorRacion = computed(() => {
    const total = this.macrosTotales();
    const r = this.raciones() || 1;
    return {
      calorias: Math.round(total.calorias / r),
      proteina: Math.round((total.proteina / r) * 10) / 10,
      carbohidratos: Math.round((total.carbohidratos / r) * 10) / 10,
      grasa: Math.round((total.grasa / r) * 10) / 10,
    };
  });

  /**
   * Determina si el formulario es válido para ser guardado.
   * Requiere al menos un nombre válido y un ingrediente.
   */
  formularioValido = computed(
    () => this.nombre().trim().length >= 2 && this.ingredientes().length > 0,
  );

  /**
   * Proporciona una vista previa de los macros del ingrediente actualmente seleccionado
   * en función de la cantidad en gramos especificada por el usuario.
   */
  macrosPreview = computed(() => {
    const food = this.foodSeleccionado();
    if (!food) return null;
    const g = this.cantidadGramos();
    return {
      calorias: Math.round((food.calorias_kcal * g) / 100),
      proteina: Math.round(((food.proteina_g * g) / 100) * 10) / 10,
      carbohidratos: Math.round(((food.carbohidratos_g * g) / 100) * 10) / 10,
      grasa: Math.round(((food.grasa_g * g) / 100) * 10) / 10,
    };
  });

  constructor() {
    addIcons({
      closeOutline,
      addOutline,
      removeOutline,
      checkmarkOutline,
      arrowBackOutline,
      nutritionOutline,
      cameraOutline,
      createOutline,
      searchOutline,
      imageOutline,
      trashOutline,
      cameraReverseOutline,
    });
  }

  /**
   * Método del ciclo de vida de Angular.
   * Verifica si la URL contiene un ID para inicializar el componente en modo edición.
   */
  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.modoEdicion.set(true);
      this.recetaId.set(id);
      await this.cargarRecetaParaEditar(id);
    }
  }

  /**
   * Carga los datos de una receta existente desde el servicio y
   * puebla los campos del formulario para su edición.
   * @param id Identificador único de la receta a cargar.
   */
  async cargarRecetaParaEditar(id: string) {
    try {
      this.cargandoDatos.set(true);
      const receta = await this.recetaService.getRecetaById(id);

      this.nombre.set(receta.nombre);
      this.instrucciones.set(receta.instrucciones || '');
      this.raciones.set(receta.raciones);
      this.tiempo_prep_min.set(receta.tiempo_prep_min || null);
      this.visibilidad.set(receta.visibilidad);
      this.tiposComidaSeleccionados.set(receta.tipo_comida || []);
      this.etiquetasSeleccionadas.set(receta.etiquetas || []);
      this.imagenUrl.set(receta.imagen_url || null);

      if (receta.receta_ingredientes) {
        const ingredientesFormato = receta.receta_ingredientes.map((ing) => ({
          food_item_id: ing.food_item_id,
          cantidad_g: ing.cantidad_g,
          cantidad_texto: ing.cantidad_texto || '',
          es_opcional: ing.es_opcional || false,
          nombre: ing.food_items?.nombre || 'Ingrediente',
          calorias_kcal: ing.food_items?.calorias_kcal || 0,
          proteina_g: ing.food_items?.proteina_g || 0,
          carbohidratos_g: ing.food_items?.carbohidratos_g || 0,
          grasa_g: ing.food_items?.grasa_g || 0,
        }));
        this.ingredientes.set(ingredientesFormato as any);
      }
    } catch (e) {
      await this.mostrarToast('Error cargando la receta para editar', 'danger');
      this.router.navigate(['/alimentacion/recetas']);
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GESTIÓN DE IMAGEN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Punto de entrada único para añadir una imagen a la receta.
   *
   * - Nativo (iOS/Android): usa el ActionSheet de Ionic + Capacitor Camera.
   *   Aquí no hay conflicto con $instanceValues$ porque Capacitor gestiona
   *   sus propios overlays nativos completamente fuera del DOM web.
   *
   * - Web/PWA: muestra un diálogo propio construido con señales de Angular.
   *   Evita el ActionSheet de Ionic en web, que es donde ocurre el crash
   *   "$instanceValues$ undefined" al desmontar componentes Stencil mientras
   *   Camera.getPhoto() intenta montar su overlay simultáneamente.
   */
  abrirSelectorImagen(): void {
    if (Capacitor.isNativePlatform()) {
      this.mostrarActionSheetNativo();
    } else {
      this.mostrarDialogoImagen.set(true);
    }
  }

  /** Cierra el diálogo de selección de imagen sin hacer nada (web). */
  cerrarDialogoImagen(): void {
    this.mostrarDialogoImagen.set(false);
  }

  /**
   * Llamado desde el diálogo web al pulsar "Tomar foto".
   * Cierra el diálogo y activa el <input capture="environment"> oculto,
   * que abre la cámara directamente sin pasar por ningún overlay de Ionic.
   */
  elegirCamaraWeb(): void {
    this.mostrarDialogoImagen.set(false);
    setTimeout(() => this.abrirModalCamara(), 50);
  }

  async abrirModalCamara(): Promise<void> {
    try {
      this.streamCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      this.mostrarModalCamara.set(true);
      // Esperamos a que Angular renderice el elemento video
      setTimeout(() => {
        const video = document.getElementById('camara-preview') as HTMLVideoElement;
        if (video && this.streamCamara) {
          video.srcObject = this.streamCamara;
          video.play();
        }
      }, 100);
    } catch (err) {
      await this.mostrarToast('No se pudo acceder a la cámara', 'danger');
    }
  }

  async capturarFotoWeb(): Promise<void> {
    const video = document.getElementById('camara-preview') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    this.cerrarModalCamara();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `receta_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.subiendoImagen.set(true);
      try {
        const url = await this.cloudinaryService.uploadImage(file);
        if (url) {
          this.imagenUrl.set(url);
        } else {
          await this.mostrarToast('Error subiendo la imagen', 'danger');
        }
      } catch {
        await this.mostrarToast('Error subiendo la imagen', 'danger');
      } finally {
        this.subiendoImagen.set(false);
      }
    }, 'image/jpeg', 0.9);
  }

  cerrarModalCamara(): void {
    if (this.streamCamara) {
      this.streamCamara.getTracks().forEach(t => t.stop());
      this.streamCamara = null;
    }
    this.mostrarModalCamara.set(false);
  }

  /**
   * Llamado desde el diálogo web al pulsar "Elegir de la galería".
   * Cierra el diálogo y activa el <input type="file"> estándar sin capture,
   * que abre el explorador de archivos / galería del SO.
   */
  elegirGaleriaWeb(): void {
    this.mostrarDialogoImagen.set(false);
    setTimeout(() => {
      const input = document.getElementById('file-galeria-receta') as HTMLInputElement;
      input?.click();
    }, 50);
  }

  /**
   * Maneja la selección de un archivo desde cualquiera de los dos
   * <input type="file"> ocultos (cámara o galería, solo web).
   * Sube el archivo a Cloudinary y actualiza la señal imagenUrl.
   */
  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Limpiamos el valor para que (change) se dispare aunque se elija
    // la misma imagen dos veces seguidas.
    input.value = '';

    if (!file) return;

    this.subiendoImagen.set(true);
    try {
      const url = await this.cloudinaryService.uploadImage(file);
      if (url) {
        this.imagenUrl.set(url);
      } else {
        await this.mostrarToast('Error subiendo la imagen', 'danger');
      }
    } catch {
      await this.mostrarToast('Error subiendo la imagen', 'danger');
    } finally {
      this.subiendoImagen.set(false);
    }
  }

  /**
   * Presenta el ActionSheet nativo para elegir entre cámara y galería.
   * Solo se invoca en iOS/Android donde Capacitor Camera funciona de forma
   * completamente nativa y no interfiere con el DOM de Ionic/Stencil.
   */
  private async mostrarActionSheetNativo(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Añadir foto de la receta',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera-outline',
          handler: () => {
            setTimeout(() => this.capturarImagenNativa(CameraSource.Camera), 300);
          },
        },
        {
          text: 'Elegir de la galería',
          icon: 'image-outline',
          handler: () => {
            setTimeout(() => this.capturarImagenNativa(CameraSource.Photos), 300);
          },
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  /**
   * Captura o selecciona una imagen usando la API de Capacitor Camera.
   * Solo debe llamarse desde plataformas nativas (iOS/Android).
   * @param source Origen de la imagen: cámara del dispositivo o galería de fotos.
   */
  private async capturarImagenNativa(source: CameraSource): Promise<void> {
    this.subiendoImagen.set(true);
    try {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source,
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `receta_${Date.now()}.jpg`, { type: 'image/jpeg' });

        const url = await this.cloudinaryService.uploadImage(file);
        if (url) {
          this.imagenUrl.set(url);
        } else {
          await this.mostrarToast('Error subiendo la imagen', 'danger');
        }
      }
    } catch (error) {
      console.warn('Selección de imagen cancelada o fallida:', error);
    } finally {
      this.subiendoImagen.set(false);
    }
  }

  /**
   * Elimina la imagen actualmente asociada a la receta.
   */
  quitarImagen(): void {
    this.imagenUrl.set(null);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BÚSQUEDA Y GESTIÓN DE INGREDIENTES
  // ─────────────────────────────────────────────────────────────────────────────

  private searchTimeout: any;

  /**
   * Se ejecuta al escribir en el buscador de ingredientes.
   * Llama al servicio de alimentos con debounce para evitar múltiples peticiones.
   */
  onBuscarAlimento(event: any) {
    const query = event.detail.value?.trim();
    this.busquedaQuery.set(query);
    if (!query || query.length < 2) {
      this.resultadosBusqueda.set([]);
      return;
    }
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      try {
        this.buscando.set(true);
        const resultados = await this.foodService.buscarAlimentos(query);

        const ordenados = resultados.sort((a, b) => {
          const pesoA = a.fuente === 'manual' || a.fuente === 'custom' ? 0 : 1;
          const pesoB = b.fuente === 'manual' || b.fuente === 'custom' ? 0 : 1;
          return pesoA - pesoB;
        });

        this.resultadosBusqueda.set(ordenados);
      } catch {
        await this.mostrarToast('Error buscando alimentos', 'danger');
      } finally {
        this.buscando.set(false);
      }
    }, 400);
  }

  formatFuente(fuente: string | undefined): string {
    if (fuente === 'manual' || fuente === 'custom') return 'Base de datos propia';
    if (fuente === 'off') return 'Open Food Facts';
    return 'Base de datos';
  }

  seleccionarFood(food: FoodItem) {
    this.foodSeleccionado.set(food);
    this.cantidadGramos.set(100);
    this.cantidadTexto.set('');
    this.esOpcional.set(false);
    this.resultadosBusqueda.set([]);
    this.busquedaQuery.set('');
  }

  cancelarSeleccion() {
    this.foodSeleccionado.set(null);
  }

  confirmarIngrediente() {
    const food = this.foodSeleccionado();
    if (!food || this.cantidadGramos() <= 0) return;

    const yaExiste = this.ingredientes().some((i) => i.food_item_id === food.id);
    if (yaExiste) {
      this.mostrarToast(`${food.nombre} ya está en la receta`, 'warning');
      this.foodSeleccionado.set(null);
      return;
    }

    this.ingredientes.update((lista) => [
      ...lista,
      {
        ...food,
        food_item_id: food.id,
        cantidad_g: this.cantidadGramos(),
        cantidad_texto: this.cantidadTexto(),
        es_opcional: this.esOpcional(),
      },
    ]);
    this.foodSeleccionado.set(null);
  }

  async guardarIngredienteManual() {
    if (!this.manualNombre().trim()) return;
    this.guardandoManual.set(true);
    try {
      const nuevoFood = await this.foodService.crearAlimentoManual({
        nombre: this.manualNombre().trim(),
        calorias_kcal: this.manualCalorias(),
        proteina_g: this.manualProteina(),
        carbohidratos_g: this.manualCarbs(),
        grasa_g: this.manualGrasa(),
        fibra_g: this.manualFibra(),
      });
      this.seleccionarFood(nuevoFood);
      this.modoManual.set(false);
      this.limpiarFormManual();
      await this.mostrarToast('Alimento guardado en tu base de datos', 'success');
    } catch {
      await this.mostrarToast('Error guardando el alimento', 'danger');
    } finally {
      this.guardandoManual.set(false);
    }
  }

  private limpiarFormManual() {
    this.manualNombre.set('');
    this.manualCalorias.set(0);
    this.manualProteina.set(0);
    this.manualCarbs.set(0);
    this.manualGrasa.set(0);
    this.manualFibra.set(0);
  }

  actualizarCantidad(index: number, valor: number) {
    this.ingredientes.update((lista) => {
      const nueva = [...lista];
      nueva[index] = { ...nueva[index], cantidad_g: Math.max(1, valor) };
      return nueva;
    });
  }

  quitarIngrediente(index: number) {
    this.ingredientes.update((lista) => lista.filter((_, i) => i !== index));
  }

  toggleTipoComida(tipo: string) {
    this.tiposComidaSeleccionados.update((tipos) =>
      tipos.includes(tipo) ? tipos.filter((t) => t !== tipo) : [...tipos, tipo],
    );
  }

  toggleEtiqueta(etiqueta: string) {
    this.etiquetasSeleccionadas.update((ets) =>
      ets.includes(etiqueta) ? ets.filter((e) => e !== etiqueta) : [...ets, etiqueta],
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GUARDADO DE RECETA
  // ─────────────────────────────────────────────────────────────────────────────

  async guardarReceta() {
    if (!this.formularioValido()) return;

    const loading = await this.loadingCtrl.create({
      message: this.modoEdicion() ? 'Actualizando receta...' : 'Guardando receta...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      const datosReceta = {
        nombre: this.nombre().trim(),
        instrucciones: this.instrucciones().trim() || undefined,
        raciones: this.raciones(),
        tiempo_prep_min: this.tiempo_prep_min() ?? undefined,
        visibilidad: this.visibilidad(),
        tipo_comida: this.tiposComidaSeleccionados(),
        etiquetas: this.etiquetasSeleccionadas(),
        imagen_url: this.imagenUrl() ?? undefined,
      };

      let idRecetaActual = '';

      if (this.modoEdicion() && this.recetaId()) {
        idRecetaActual = this.recetaId()!;
        await this.recetaService.actualizarReceta(idRecetaActual, datosReceta);
        await this.recetaService.eliminarIngredientesDeReceta(idRecetaActual);
      } else {
        const recetaNueva = await this.recetaService.crearReceta(datosReceta);
        idRecetaActual = recetaNueva.id;
      }

      await Promise.all(
        this.ingredientes().map((ing, index) =>
          this.recetaService.addIngrediente({
            receta_id: idRecetaActual,
            food_item_id: ing.food_item_id,
            cantidad_g: ing.cantidad_g,
            cantidad_texto: ing.cantidad_texto || undefined,
            es_opcional: ing.es_opcional,
            orden: index,
          }),
        ),
      );

      await loading.dismiss();
      await this.mostrarToast(
        this.modoEdicion() ? 'Receta actualizada' : 'Receta guardada',
        'success',
      );

      if (this.modoEdicion()) {
        this.router.navigate(['/alimentacion/recetas', idRecetaActual]);
      } else {
        this.router.navigate(['/alimentacion/recetas']);
      }
    } catch {
      await loading.dismiss();
      await this.mostrarToast('Error al guardar la receta', 'danger');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────────────────────

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  ionViewWillEnter() {
    this.nombre.set('');
    this.instrucciones.set('');
    this.raciones.set(1);
    this.tiempo_prep_min.set(null);
    this.visibilidad.set('privada');
    this.tiposComidaSeleccionados.set([]);
    this.etiquetasSeleccionadas.set([]);
    this.ingredientes.set([]);
    this.foodSeleccionado.set(null);
    this.resultadosBusqueda.set([]);
    this.busquedaQuery.set('');
    this.imagenUrl.set(null);
    this.mostrarDialogoImagen.set(false);
    this.modoManual.set(false);
    this.limpiarFormManual();
  }
}