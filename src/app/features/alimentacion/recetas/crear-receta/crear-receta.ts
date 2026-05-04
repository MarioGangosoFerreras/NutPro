// crear-receta.ts
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
} from '@ionic/angular/standalone';
import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  cameraOutline,
  checkmarkOutline,
  closeOutline,
  createOutline,
  nutritionOutline,
  removeOutline,
  searchOutline,
} from 'ionicons/icons';
import { RecetaService } from '../../../../core/services/receta';
import { FoodItem, FoodService, IngredienteLocal } from '../../../../core/services/food';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { Header } from "../../../../shared/components/header/header";

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
    Header
  ],
  templateUrl: './crear-receta.html',
})
export class CrearReceta {
  private recetaService = inject(RecetaService);
  private foodService = inject(FoodService);
  private cloudinaryService = inject(CloudinaryService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private route = inject(ActivatedRoute);

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

      // Adaptamos los ingredientes para que el formulario los entienda igual
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

  /**
   * Gestiona el evento de selección de un archivo de imagen, subiéndolo a Cloudinary.
   * @param event Evento nativo del input file.
   */
  async onSeleccionarImagen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
      input.value = '';
    }
  }

  /**
   * Elimina la imagen actualmente asociada a la receta.
   */
  quitarImagen() {
    this.imagenUrl.set(null);
  }

  private searchTimeout: any;

  /**
   * Se ejecuta al escribir en el buscador de ingredientes.
   * Llama al servicio de alimentos con debounce para evitar múltiples peticiones.
   * @param event Evento emitido por el IonSearchbar.
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

        // ORDENAR: Primero los ingredientes de creación propia, luego los externos (Open Food Facts u otros)
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

  /**
   * Formatea la cadena de origen de la fuente para mostrar en la interfaz.
   * @param fuente Código de la fuente del alimento (ej. 'off', 'manual').
   * @returns Nombre legible de la base de datos o fuente.
   */
  formatFuente(fuente: string | undefined): string {
    if (fuente === 'manual' || fuente === 'custom') return 'Base de datos propia';
    if (fuente === 'off') return 'Open Food Facts';
    return 'Base de datos'; // Por defecto/caché general
  }

  /**
   * Selecciona un alimento de los resultados de búsqueda para configurarlo.
   * @param food Objeto del alimento seleccionado.
   */
  seleccionarFood(food: FoodItem) {
    this.foodSeleccionado.set(food);
    this.cantidadGramos.set(100);
    this.cantidadTexto.set('');
    this.esOpcional.set(false);
    this.resultadosBusqueda.set([]);
    this.busquedaQuery.set('');
  }

  /**
   * Cancela la selección actual del alimento y limpia el configurador.
   */
  cancelarSeleccion() {
    this.foodSeleccionado.set(null);
  }

  /**
   * Confirma la configuración actual del ingrediente y lo añade a la lista de ingredientes de la receta.
   */
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

  /**
   * Guarda un alimento ingresado manualmente en la base de datos de usuario,
   * y luego lo auto-selecciona para agregarlo a la receta.
   */
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

  /**
   * Limpia los campos del formulario de ingreso manual de alimentos.
   */
  private limpiarFormManual() {
    this.manualNombre.set('');
    this.manualCalorias.set(0);
    this.manualProteina.set(0);
    this.manualCarbs.set(0);
    this.manualGrasa.set(0);
    this.manualFibra.set(0);
  }

  /**
   * Actualiza la cantidad en gramos de un ingrediente ya presente en la lista de la receta.
   * @param index Índice del ingrediente en el array.
   * @param valor Nueva cantidad en gramos (mínimo 1).
   */
  actualizarCantidad(index: number, valor: number) {
    this.ingredientes.update((lista) => {
      const nueva = [...lista];
      nueva[index] = { ...nueva[index], cantidad_g: Math.max(1, valor) };
      return nueva;
    });
  }

  /**
   * Elimina un ingrediente de la lista actual de la receta.
   * @param index Índice del ingrediente a remover.
   */
  quitarIngrediente(index: number) {
    this.ingredientes.update((lista) => lista.filter((_, i) => i !== index));
  }

  /**
   * Alterna la selección de una etiqueta de tipo de comida (ej: Desayuno, Cena).
   * @param tipo Identificador del tipo de comida.
   */
  toggleTipoComida(tipo: string) {
    this.tiposComidaSeleccionados.update((tipos) =>
      tipos.includes(tipo) ? tipos.filter((t) => t !== tipo) : [...tipos, tipo],
    );
  }

  /**
   * Alterna la selección de una etiqueta dietética especial (ej: sin_gluten, vegano).
   * @param etiqueta Identificador de la etiqueta.
   */
  toggleEtiqueta(etiqueta: string) {
    this.etiquetasSeleccionadas.update((ets) =>
      ets.includes(etiqueta) ? ets.filter((e) => e !== etiqueta) : [...ets, etiqueta],
    );
  }

  /**
   * Agrupa los datos del componente y los envía al servicio correspondiente
   * para guardar la receta (crear nueva o actualizar existente).
   */
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
        // ACTUALIZAR RECETA EXISTENTE
        idRecetaActual = this.recetaId()!;
        await this.recetaService.actualizarReceta(idRecetaActual, datosReceta);
        await this.recetaService.eliminarIngredientesDeReceta(idRecetaActual); // Limpieza de viejos ingredientes
      } else {
        // CREAR NUEVA RECETA
        const recetaNueva = await this.recetaService.crearReceta(datosReceta);
        idRecetaActual = recetaNueva.id;
      }

      // Insertamos los ingredientes de la lista actual (sean nuevos o editados)
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

      // Redireccionamiento posterior
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

  /**
   * Método de utilidad para renderizar Toasts (mensajes flotantes).
   * @param message Mensaje a mostrar.
   * @param color Color del componente (success, danger, warning).
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

  /**
   * Hook de Ionic que se ejecuta justo antes de mostrar la vista.
   * Sirve para limpiar el formulario y asegurar un estado inicial correcto.
   */
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
    this.modoManual.set(false);
    this.limpiarFormManual();
  }
}