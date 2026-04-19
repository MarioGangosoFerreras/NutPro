import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonSearchbar,
  IonList,
  IonChip,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonNote,
  IonSpinner,
  IonRange,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  addOutline,
  removeOutline,
  checkmarkOutline,
  arrowBackOutline,
  nutritionOutline,
} from 'ionicons/icons';
import { RecetaService } from '../../../../core/services/receta';
import { FoodItem, FoodService } from '../../../../core/services/food';

interface IngredienteLocal {
  food_item_id: string;
  nombre: string;
  cantidad_g: number;
  cantidad_texto: string;
  es_opcional: boolean;
  // Macros del food_item (por 100g)
  calorias_kcal: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasa_g: number;
  fibra_g: number;
}

@Component({
  selector: 'app-crear-receta',
  templateUrl: './crear-receta.html',
  styleUrls: ['./crear-receta.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonSearchbar,
    IonList,
    IonChip,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonNote,
    IonSpinner,
    IonRange,
  ],
})
export class CrearRecetaPage {
  private recetaService = inject(RecetaService);
  private foodService = inject(FoodService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  router = inject(Router);

  // ─── Datos del formulario ──────────────────────────────────────────────────
  nombre = signal('');
  descripcion = signal('');
  instrucciones = signal('');
  raciones = signal(1);
  tiempo_prep_min = signal<number | null>(null);
  visibilidad = signal<'publica' | 'privada'>('privada');
  tiposComidaSeleccionados = signal<string[]>([]);
  etiquetasSeleccionadas = signal<string[]>([]);

  // ─── Ingredientes añadidos a la receta ────────────────────────────────────
  ingredientes = signal<IngredienteLocal[]>([]);

  // ─── Buscador de alimentos ─────────────────────────────────────────────────
  resultadosBusqueda = signal<FoodItem[]>([]);
  buscando = signal(false);
  busquedaQuery = signal('');

  // ─── Estado del ingrediente que se está configurando ──────────────────────
  foodSeleccionado = signal<FoodItem | null>(null);
  cantidadGramos = signal(100);
  cantidadTexto = signal('');
  esOpcional = signal(false);

  // ─── Opciones disponibles ──────────────────────────────────────────────────
  readonly tiposComida = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena', 'snack'];
  readonly etiquetas = [
    'sin_gluten',
    'sin_lactosa',
    'vegano',
    'vegetariano',
    'bajo_fodmap',
    'sin_azucar',
    'alto_proteico',
  ];

  // ─── Macros totales calculados en tiempo real ─────────────────────────────
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

  // Macros por ración
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

  formularioValido = computed(
    () => this.nombre().trim().length >= 2 && this.ingredientes().length > 0,
  );

  constructor() {
    addIcons({
      closeOutline,
      addOutline,
      removeOutline,
      checkmarkOutline,
      arrowBackOutline,
      nutritionOutline,
    });
  }

  // ─── Búsqueda de alimentos ─────────────────────────────────────────────────
  private searchTimeout: any;

  onBuscarAlimento(event: any) {
    const query = event.detail.value?.trim();
    this.busquedaQuery.set(query);

    if (!query || query.length < 2) {
      this.resultadosBusqueda.set([]);
      return;
    }

    // Debounce de 400ms para no llamar en cada tecla
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      try {
        this.buscando.set(true);
        const resultados = await this.foodService.buscarAlimentos(query);
        this.resultadosBusqueda.set(resultados);
      } catch {
        await this.mostrarToast('Error buscando alimentos', 'danger');
      } finally {
        this.buscando.set(false);
      }
    }, 400);
  }

  // ─── Seleccionar un alimento del buscador ─────────────────────────────────
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

  // Preview de macros del alimento seleccionado según cantidad
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

  // ─── Confirmar y añadir ingrediente ───────────────────────────────────────
  confirmarIngrediente() {
    const food = this.foodSeleccionado();
    if (!food || this.cantidadGramos() <= 0) return;

    // Evitar duplicados
    const yaExiste = this.ingredientes().some((i) => i.food_item_id === food.id);
    if (yaExiste) {
      this.mostrarToast(`${food.nombre} ya está en la receta`, 'warning');
      this.foodSeleccionado.set(null);
      return;
    }

    this.ingredientes.update((lista) => [
      ...lista,
      {
        food_item_id: food.id,
        nombre: food.nombre,
        cantidad_g: this.cantidadGramos(),
        cantidad_texto: this.cantidadTexto(),
        es_opcional: this.esOpcional(),
        calorias_kcal: food.calorias_kcal,
        proteina_g: food.proteina_g,
        carbohidratos_g: food.carbohidratos_g,
        grasa_g: food.grasa_g,
        fibra_g: food.fibra_g,
      },
    ]);

    this.foodSeleccionado.set(null);
  }

  // ─── Editar cantidad de un ingrediente ya añadido ─────────────────────────
  actualizarCantidad(index: number, valor: number) {
    this.ingredientes.update((lista) => {
      const nueva = [...lista];
      nueva[index] = { ...nueva[index], cantidad_g: Math.max(1, valor) };
      return nueva;
    });
  }

  // ─── Quitar ingrediente ────────────────────────────────────────────────────
  quitarIngrediente(index: number) {
    this.ingredientes.update((lista) => lista.filter((_, i) => i !== index));
  }

  // ─── Toggle tipo de comida ─────────────────────────────────────────────────
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

  // ─── Guardar receta ────────────────────────────────────────────────────────
  async guardarReceta() {
    if (!this.formularioValido()) return;

    const loading = await this.loadingCtrl.create({ message: 'Guardando receta...' });
    await loading.present();

    try {
      // 1. Crear la receta
      const receta = await this.recetaService.crearReceta({
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        instrucciones: this.instrucciones().trim() || undefined,
        raciones: this.raciones(),
        tiempo_prep_min: this.tiempo_prep_min() ?? undefined,
        visibilidad: this.visibilidad(),
        tipo_comida: this.tiposComidaSeleccionados(),
        etiquetas: this.etiquetasSeleccionadas(),
      });

      // 2. Añadir ingredientes (el trigger de Supabase recalcula macros automáticamente)
      await Promise.all(
        this.ingredientes().map((ing, index) =>
          this.recetaService.addIngrediente({
            receta_id: receta.id,
            food_item_id: ing.food_item_id,
            cantidad_g: ing.cantidad_g,
            cantidad_texto: ing.cantidad_texto || undefined,
            es_opcional: ing.es_opcional,
            orden: index,
          }),
        ),
      );

      await loading.dismiss();
      await this.mostrarToast('Receta guardada correctamente', 'success');
      this.router.navigate(['/alimentacion/recetas']);
    } catch (e) {
      await loading.dismiss();
      await this.mostrarToast('Error guardando la receta', 'danger');
    }
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

  //Limpiar formulario
  ionViewWillEnter() {
    this.nombre.set('');
    this.descripcion.set('');
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
  }
}
