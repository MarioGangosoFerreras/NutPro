import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonContent,
  IonItem,
  IonInput,
  IonTextarea,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  scaleOutline,
  createOutline,
  trashOutline,
  listOutline,
  barChartOutline,
  closeOutline,
  saveOutline,
} from 'ionicons/icons';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

// Tipo definido sin 'altura' para el gráfico
type TipoGrafica = 'peso' | 'grasa' | 'musculo' | 'cintura' | 'cadera' | 'abdomen';

/**
 * Componente que representa la pestaña de "Mediciones" (evolución antropométrica).
 * Visualiza la lista de medidas tomadas a un paciente con opciones a representar
 * gráficas evolutivas, basándose en la librería Chart.js.
 *
 * @export
 * @class TabMediciones
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-mediciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonContent,
    IonItem,
    IonInput,
    IonTextarea,
  ],
  templateUrl: './tab-mediciones.html',
  styleUrl: './tab-mediciones.css',
})
export class TabMediciones implements OnInit {
  /** Estructura con datos del paciente. */
  @Input() paciente: any;
  /** Determina si al entrar se fuerza a "lista" de resultados o a "grafico" renderizado. */
  @Input() vistaInicial: 'lista' | 'grafico' = 'lista';
  /** Oculta o modifica los espacios UI pensando que este tab ocupa su página entera (Ej. vista del paciente). */
  @Input() modoPantallaCompleta: boolean = false;
  /** Habilita ciertas lógicas y bloquea borrados en medidas tomadas por un nutricionista si el logueado es Paciente. */
  @Input() esPaciente: boolean = false;

  mediciones: any[] = [];
  loading = false;
  guardandoMedicion = false;
  modalNueva = false;
  modalEditar = false;
  vistaActual: 'lista' | 'grafico' = 'lista';
  graficaActiva: TipoGrafica = 'peso';

  /** Plantilla bidireccional donde escribirán los inputs en la creacion HTML. */
  nuevaMedicion: any = this.medicionVacia();
  /** Plantilla bidireccional donde escribiran los inputs en la modificacion. */
  medicionEditando: any = {};

  /** Instancia oficial del componente chart.js renderizado; necesaria para destruir la etiqueta canvas tras cada reescritura. */
  private chartInstance: Chart | null = null;

  /**
   * Crea una instancia de TabMediciones integrando en el panel ChartJS, el controlador asíncrono
   * para consultas de fichas, y herramientas de UI como Modal, Toast y Change Detection de angular.
   *
   * @param {FichaClinicaService} fichaClinicaService - Interactor de base de datos.
   * @param {ChangeDetectorRef} cdr - Herramienta interna framework.
   * @param {ToastController} toastCtrl - Diálogo para notificar confirmaciones inferiores.
   * @param {AlertController} alertCtrl - Diálogo centrado en la pantalla (Confirmación delete).
   */
  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      addOutline,
      scaleOutline,
      createOutline,
      trashOutline,
      listOutline,
      barChartOutline,
      closeOutline,
      saveOutline,
    });
  }

  /**
   * Recupera las mediciones iniciales, asigna el layout predeterminado de renderización
   * e inicializa las graficas si el modo de interfaz inicial correspondía a estas.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    this.vistaActual = this.vistaInicial;
    await this.cargarMediciones();
  }

  /**
   * Define en una variable auxiliar constante una arquitectura reseteada. 
   * Útil tras terminar creaciones.
   *
   * @private
   * @returns {*}
   */
  private medicionVacia() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      peso_kg: null,
      altura_cm: null,
      grasa_corporal_pct: null,
      masa_muscular_kg: null,
      perimetro_cintura_cm: null,
      perimetro_cadera_cm: null,
      perimetro_abdomen_cm: null,
      notas: '',
    };
  }

  /**
   * Descarga la evolución médica íntegra guardada desde DB asociada y da la orden de pintar 
   * el ChartJS (con pequeño timeout preventivo de render) en caso de que corresponda.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async cargarMediciones() {
    this.loading = true;
    try {
      this.mediciones = await this.fichaClinicaService.getMediciones(this.paciente.id);
      if (
        (this.vistaActual === 'grafico' || this.modoPantallaCompleta) &&
        this.mediciones.length > 0
      ) {
        setTimeout(() => this.renderizarGrafico(), 200);
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /** Abre la vista HTML embebida tipo modal y genera objeto en limpio. */
  abrirNueva() {
    this.nuevaMedicion = this.medicionVacia();
    this.modalNueva = true;
  }

  /** Abre la vista HTML embebida tipo modal clonando los datos de la fila concreta que la invoque. */
  abrirEditar(m: any) {
    this.medicionEditando = { ...m };
    this.modalEditar = true;
  }

  /**
   * Procesa la directiva asíncrona hacia Supabase usando el rol enlazado como autor
   * para guardar la modificación o nueva medida insertada dentro del componente modal.
   *
   * @returns {Promise<void>}
   */
  async guardarNueva() {
    this.guardandoMedicion = true;
    try {
      // Marcamos quién está registrando la medida
      this.nuevaMedicion.registrado_por = this.esPaciente ? 'paciente' : 'nutricionista';

      await this.fichaClinicaService.addMedicion(this.paciente.id, this.nuevaMedicion);
      
      // 1. Apagamos el spinner y cerramos el modal síncronamente
      this.guardandoMedicion = false;
      this.modalNueva = false;
      this.cdr.detectChanges(); // Angular procesa todo a la vez sin errores

      // 2. Recargamos la lista en segundo plano y lanzamos el toast
      await this.cargarMediciones();
      await this.mostrarToast('Medición añadida', 'success');
    } catch (e) {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
      await this.mostrarToast('Error al guardar', 'danger');
    }
  }

  /**
   * Procesa la directiva hacia la API que actualiza un registro previamente
   * poblado que procedía del Modal de Editar. Cierra y recarga al terminar el Request.
   *
   * @returns {Promise<void>}
   */
  async guardarEdicion() {
    this.guardandoMedicion = true;
    try {
      await this.fichaClinicaService.updateMedicion(
        this.medicionEditando.id,
        this.medicionEditando,
      );
      
      // 1. Apagamos el spinner y cerramos el modal síncronamente
      this.guardandoMedicion = false;
      this.modalEditar = false;
      this.cdr.detectChanges(); // Angular procesa todo a la vez sin errores

      // 2. Recargamos la lista en segundo plano y lanzamos el toast
      await this.cargarMediciones();
      await this.mostrarToast('Medición actualizada', 'success');
    } catch (e) {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
      await this.mostrarToast('Error al actualizar', 'danger');
    }
  }

  /**
   * Validación técnica y visual en interfaz que asegura que si es una cuenta `paciente`, 
   * únicamente aparezca en la lista el botón editar/lápiz en caso de ser él su autor.
   *
   * @param {*} medida - Objeto de medición iterado en lista.
   * @returns {boolean} Retorna verdadero o falso dictaminando permiso.
   */
  puedoEditarMedida(medida: any): boolean {
    if (!this.esPaciente) return true; // El nutricionista edita todo
    // El paciente SOLO edita si él mismo registró la medida
    return medida.registrado_por === 'paciente';
  }

  /**
   * Reevalúa la renderización del canvas de Chart.JS ordenando un repintado de gráfico 
   * cambiando la fuente original de la base de datos visualizada.
   *
   * @param {TipoGrafica} tipo - Propiedad métrica concreta (peso, grasa, abdomen, cadera, etc).
   */
  cambiarGrafica(tipo: TipoGrafica) {
    this.graficaActiva = tipo;
    this.renderizarGrafico();
    this.cdr.detectChanges();
  }

  /**
   * Centralita constructora del objeto nativo `Chart` que es introducido asíncronamente
   * como innerHTML en el `id="medicionesChart"`. Destruye la instancia en memoria si ya
   * había sido declarada antes para eludir bugs de solapamiento que provocan destellos.
   *
   * @private
   * @returns {void}
   */
  private renderizarGrafico() {
    const canvas = document.getElementById('medicionesChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.chartInstance?.destroy();

    const ordenadas = [...this.mediciones].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    const configs: Record<string, { campo: string; label: string; color: string }> = {
      peso: { campo: 'peso_kg', label: 'Peso (kg)', color: '#2d6a4f' },
      grasa: { campo: 'grasa_corporal_pct', label: 'Grasa corporal (%)', color: '#e07b39' },
      musculo: { campo: 'masa_muscular_kg', label: 'Masa muscular (kg)', color: '#3b82f6' },
      cintura: { campo: 'perimetro_cintura_cm', label: 'Cintura (cm)', color: '#a855f7' },
      cadera: { campo: 'perimetro_cadera_cm', label: 'Cadera (cm)', color: '#ec4899' },
      abdomen: { campo: 'perimetro_abdomen_cm', label: 'Abdomen (cm)', color: '#6366f1' },
    };

    const cfg = configs[this.graficaActiva];
    if (!cfg) return;

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ordenadas.map((m) => {
          const d = new Date(m.fecha);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        datasets: [
          {
            label: cfg.label,
            data: ordenadas.map((m) => m[cfg.campo] ?? null),
            borderColor: cfg.color,
            backgroundColor: cfg.color + '18',
            fill: true,
            tension: 0.4,
            spanGaps: true,
            pointBackgroundColor: cfg.color,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: false } },
      },
    });
  }

  /**
   * Bloqueador de seguridad UX con doble check pre-delete (sólo a nivel nutricionista).
   *
   * @param {string} id - Id a eliminar en base de datos.
   * @returns {Promise<void>}
   */
  async confirmarEliminar(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar',
      message: '¿Borrar esta medición?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí',
          role: 'destructive',
          handler: async () => {
            await this.fichaClinicaService.deleteMedicion(id);
            this.mediciones = this.mediciones.filter((m) => m.id !== id);
            if (this.vistaActual === 'grafico' || this.modoPantallaCompleta)
              this.renderizarGrafico();
            this.cdr.detectChanges();
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Ejecuta el callback en IonSegment y pinta u oculta componentes.
   * Si detecta mutación al área de vista gráficos, llama la construcción del `renderizarGrafico`.
   *
   * @param {*} event - Change emit event Ionic segment.
   */
  cambiarVista(event: any) {
    this.vistaActual = event.detail.value;
    if (this.vistaActual === 'grafico') setTimeout(() => this.renderizarGrafico(), 100);
    this.cdr.detectChanges();
  }

  /**
   * Traduce el número numérico crudo derivado del cálculo del Índice de Masa Corporal
   * a una categoría médica descriptiva visual con un color de design system aparejado.
   *
   * @param {number} imc - Parámetro del peso / talla² calculado.
   * @returns {{ label: string; color: string; }} Configuración UI en IonBadge.
   */
  imcCategoria(imc: number) {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'warning' };
    if (imc < 25) return { label: 'Normopeso', color: 'success' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'warning' };
    return { label: 'Obesidad', color: 'danger' };
  }

  /**
   * Evalúa el resultado del ICC y el sexo biológico para retornar etiquetas
   * de riesgo cardiovascular acordes al design system y escalas aprobadas por la OMS.
   *
   * @param {number} icc - Relación matemática cadera/cintura devuelta del trigger interno sql.
   * @param {string} sexo - Discriminador clave para aplicar fórmulas de la escala adecuada.
   * @returns {{ label: string; color: string; }} Objeto UI visual a embeber.
   */
  iccCategoria(icc: number, sexo: string) {
    const esMujer = sexo === 'femenino';
    if (esMujer) {
      if (icc < 0.75) return { label: 'Bajo riesgo', color: 'warning' };
      if (icc < 0.85) return { label: 'Normal', color: 'success' };
      return { label: 'Riesgo alto', color: 'danger' };
    }
    if (icc < 0.8) return { label: 'Bajo riesgo', color: 'warning' };
    if (icc < 0.9) return { label: 'Normal', color: 'success' };
    return { label: 'Riesgo alto', color: 'danger' };
  }

  /**
   * Levanta un Toast interactivo para emitir un aviso en la app.
   *
   * @private
   * @param {string} mensaje - El texto emergente que aparece al usuario.
   * @param {string} color - Patrón de color (como success o warning).
   * @returns {Promise<void>}
   */
  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}