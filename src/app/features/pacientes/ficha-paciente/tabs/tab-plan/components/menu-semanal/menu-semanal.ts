import { Component, Input, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonBadge, IonSpinner, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
  ModalController,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, restaurantOutline, downloadOutline, closeCircle } from 'ionicons/icons';
import { PlanNutricionalService } from '../../../../../../../core/services/plan-nutricional';
import { PdfService } from '../../../../../../../core/services/pdf';
import { ModalSeleccionarReceta } from '../modal-selecionar-receta/modal-selecionar-receta';

/**
 * Componente interactivo que genera una tabla (grid) tipo cuadrícula
 * listando cada día de la semana y sus horarios de comida (desayuno, comida, merienda...).
 * También controla la inserción o borrado de recetas incrustadas, y el descargo en formato PDF.
 *
 * @export
 * @class MenuSemanalComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-menu-semanal',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonButton, IonIcon, IonSpinner, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent],
  templateUrl: './menu-semanal.html',
  styleUrls: ['./menu-semanal.css'],
})
export class MenuSemanalComponent implements OnInit {
  /** ID nativo del plan padre vinculado a este registro de base de datos. */
  @Input() planId!: string;
  /** UUID Supabase para correlacionar con tabla de pacientes o Auth. */
  @Input() pacienteId!: string;
  /** Techo máximo o cuota diaria de macros (calorías). */
  @Input() caloriasObjetivo: number = 0;
  /** Requisito restrictivo de ingredientes a evitar en menús automáticos. */
  @Input() alergias: string[] = [];
  /** Requisito limitante adicional de ingredientes a evitar. */
  @Input() intolerancias: string[] = [];
  /** Colección completa con la ficha para posibilitar exportación de pdf con sus datos. */
  @Input() paciente: any;
  /** Información integral contenida en la tabla `planes_nutricionales`. */
  @Input() planActivo: any;
  /** Booleano derivado de App portal que indica la negación de manipulación, pasando a "read-only". */
  @Input() modoLectura: boolean = false; 

  private planService = inject(PlanNutricionalService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef);
  private pdfService = inject(PdfService);

  cargando = true;
  menuActivo: any = null;
  entradas: any[] = [];

  // Variables para el modal de ver receta (Modo paciente)
  modalRecetaAbierto = signal(false);
  recetaSeleccionada = signal<any>(null);

  /** Configuración fija de matriz que provee los iteradores a crear 7 cajas. */
  dias = [
    { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sábado' }, { id: 7, nombre: 'Domingo' }
  ];

  /** Configuración array interior que subdivide las 7 cajas generadas anteriormente en secciones internas. */
  tiposComida = [
    { id: 'desayuno', label: 'Desayuno' }, { id: 'comida', label: 'Comida' },
    { id: 'snack', label: 'Snacks' }, { id: 'cena', label: 'Cena' }
  ];

  /** Define, importa y registra al sistema visual interno de Ionic la galería vectorial. */
  constructor() {
    addIcons({ addOutline, trashOutline, restaurantOutline, downloadOutline, closeCircle });
  }

  /**
   * Método Lifecycle que fuerza inicialmente un request a la tabla general Supabase 
   * garantizando una carga progresiva controlando el componente spinner cargando.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarMenu();
  }

  /**
   * Dispara el servicio base buscando la existencia del menú general 
   * y luego consulta si dentro del interior hay entradas cargadas o guardadas por ID en el puente tabla a tabla.
   *
   * @returns {Promise<void>}
   */
  async cargarMenu() {
    this.cargando = true;
    try {
      this.menuActivo = await this.planService.getOrCreateMenuParaPlan(this.planId, this.pacienteId);
      this.entradas = await this.planService.getEntradasMenu(this.menuActivo.id);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Devuelve para la estructura HTML un array sub-filtrado localmente con aquellas
   * "recetas vinculadas" correspondientes justo y exacto a donde fue colocada (día e index).
   *
   * @param {number} diaId - Numero referencial (Lunes = 1, Domingo = 7).
   * @param {string} tipoComida - Formato string interno (`cena` , `desayuno`).
   * @returns {*} Conjunto Array filtrado en tiempo ejecución.
   */
  obtenerEntradas(diaId: number, tipoComida: string) {
    return this.entradas.filter((e) => e.dia_semana === diaId && e.tipo_comida === tipoComida);
  }

  /**
   * Operación matemática reductora acumulando numéricamente las calorías correspondientes
   * a todos los platos inyectados en la columna vertical del día en cuestión.
   *
   * @param {number} diaId - ID de iteración entre la constante arrays interna `dias`.
   * @returns {number} Conteo entero base en total sumado en base a propiedades.
   */
  getTotalKcalDia(diaId: number): number {
    return this.entradas.filter((e) => e.dia_semana === diaId).reduce((total, e) => total + (e.receta?.calorias_kcal || 0), 0);
  }

  /**
   * Llama un Ionic Popup a pantalla completa con las recetas activas del nutricionista
   * esperando confirmación tras haber seleccionado uno para poder insertarlo.
   *
   * @param {number} diaId - Contexto espacial del clic recibido de las coordenadas HTML.
   * @param {string} tipoComida - Contexto horario vertical del clic del botón '+'.
   * @returns {Promise<void>}
   */
  async abrirModalRecetas(diaId: number, tipoComida: string) {
    const modal = await this.modalCtrl.create({
      component: ModalSeleccionarReceta,
      componentProps: { alergias: this.alergias || [], intolerancias: this.intolerancias || [] },
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8,
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role === 'seleccionado' && data) {
      await this.asignarReceta(diaId, tipoComida, data);
    }
  }

  /**
   * Procesa la directiva asíncrona hacia Supabase usando el servicio para añadir
   * y persistir una "entrada/plato" relacionalmente vinculando la receta ID al Plan.
   *
   * @param {number} diaId - ID día iterador.
   * @param {string} tipoComida - Turno del alimento.
   * @param {*} receta - Objeto payload extraído de `modalReceta` dismiss.
   * @returns {Promise<void>}
   */
  async asignarReceta(diaId: number, tipoComida: string, receta: any) {
    try {
      const nuevaEntrada = await this.planService.addEntradaMenu({
        menu_id: this.menuActivo.id, receta_id: receta.id, dia_semana: diaId, tipo_comida: tipoComida, raciones: 1
      });
      if (!nuevaEntrada.receta) nuevaEntrada.receta = receta;
      this.entradas.push(nuevaEntrada);
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  /**
   * Ordena en base de datos al componente un DELETE asíncrono sobre una entrada 
   * y una remoción visual inmedita sobre el array nativo `entradas`.
   *
   * @param {string} entradaId - UUID del registro que contiene la unión de receta y día.
   * @returns {Promise<void>}
   */
  async eliminarEntrada(entradaId: string) {
    try {
      await this.planService.deleteEntradaMenu(entradaId);
      this.entradas = this.entradas.filter((e) => e.id !== entradaId);
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  /**
   * Encapsula los diferentes variables inputs y llama al creador interno jspdf
   * procesando y maquetando el formato landscape del cuadro de alimentación exportado en descargas.
   *
   * @returns {Promise<void>}
   */
  async exportarPDF() {
    if (!this.paciente || !this.planActivo) return;
    this.cargando = true;
    try {
      await this.pdfService.exportarMenuSemanal(this.paciente, this.planActivo, this.entradas);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  // 👇 NUEVO: Lógica para abrir el detalle si es paciente
  /**
   * Asignación interna que fuerza mostrar a detalle (modo Lectura) un plato
   * si el flag `modoLectura` derivado del PortalPaciente permitía clicables visuales.
   *
   * @param {*} receta - Objeto con valores nutricionales extraído localmente por angular.
   */
  abrirReceta(receta: any) {
    if (!this.modoLectura || !receta) return;
    this.recetaSeleccionada.set(receta);
    this.modalRecetaAbierto.set(true);
  }
  
  /** Cierra la pestaña abierta de la receta mostrada y limpia su estado visual reactivo. */
  cerrarReceta() {
    this.modalRecetaAbierto.set(false);
    setTimeout(() => this.recetaSeleccionada.set(null), 300);
  }
}