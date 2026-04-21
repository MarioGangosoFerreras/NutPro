// crear-receta.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
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
  IonProgressBar,
  IonThumbnail,
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

@Component({
  selector: 'app-crear-receta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
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
  ],
  templateUrl: './crear-receta.html',
})
export class CrearReceta {
  private recetaService = inject(RecetaService);
  private foodService = inject(FoodService);
  private cloudinaryService = inject(CloudinaryService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  router = inject(Router);

  nombre = signal('');
  descripcion = signal('');
  instrucciones = signal('');
  raciones = signal(1);
  tiempo_prep_min = signal<number | null>(null);
  visibilidad = signal<'publica' | 'privada'>('privada');
  tiposComidaSeleccionados = signal<string[]>([]);
  etiquetasSeleccionadas = signal<string[]>([]);

  imagenUrl = signal<string | null>(null);
  subiendoImagen = signal(false);

  ingredientes = signal<IngredienteLocal[]>([]);

  resultadosBusqueda = signal<FoodItem[]>([]);
  buscando = signal(false);
  busquedaQuery = signal('');

  foodSeleccionado = signal<FoodItem | null>(null);
  cantidadGramos = signal(100);
  cantidadTexto = signal('');
  esOpcional = signal(false);

  modoManual = signal(false);
  manualNombre = signal('');
  manualCalorias = signal(0);
  manualProteina = signal(0);
  manualCarbs = signal(0);
  manualGrasa = signal(0);
  manualFibra = signal(0);
  guardandoManual = signal(false);

  readonly tiposComida = ['desayuno', 'comida', 'cena', 'snacks'];
  readonly etiquetas = [
    'sin_gluten',
    'sin_lactosa',
    'vegano',
    'vegetariano',
    'bajo_fodmap',
    'sin_azucar',
    'alto_proteico',
  ];

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

  quitarImagen() {
    this.imagenUrl.set(null);
  }

  private searchTimeout: any;

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

  // Método auxiliar para mostrar la fuente de forma legible en el HTML
  formatFuente(fuente: string | undefined): string {
    if (fuente === 'manual' || fuente === 'custom') return 'Base de datos propia';
    if (fuente === 'off') return 'Open Food Facts';
    return 'Base de datos'; // Por defecto/caché general
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

  async guardarReceta() {
    if (!this.formularioValido()) return;
    const loading = await this.loadingCtrl.create({ message: 'Guardando receta...' });
    await loading.present();
    try {
      const receta = await this.recetaService.crearReceta({
        nombre: this.nombre().trim(),
        descripcion: this.descripcion().trim() || undefined,
        instrucciones: this.instrucciones().trim() || undefined,
        raciones: this.raciones(),
        tiempo_prep_min: this.tiempo_prep_min() ?? undefined,
        visibilidad: this.visibilidad(),
        tipo_comida: this.tiposComidaSeleccionados(),
        etiquetas: this.etiquetasSeleccionadas(),
        imagen_url: this.imagenUrl() ?? undefined,
      });

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
    } catch {
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
    this.imagenUrl.set(null);
    this.modoManual.set(false);
    this.limpiarFormManual();
  }
}
