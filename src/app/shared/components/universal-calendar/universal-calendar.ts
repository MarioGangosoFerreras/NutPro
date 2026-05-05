import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  addCircleOutline,
  calendarOutline,
  videocamOutline,
  locationOutline,
  documentTextOutline,
  trashOutline,
} from 'ionicons/icons';
import { CitasService, Cita } from '../../../core/services/citas';
import { AuthService } from '../../../core/services/auth';
import { CitaCard } from '../cita-card/cita-card';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ModalCitaComponent } from '../modal-cita/modal-cita';

/** Múltiples formatos/layouts visuales que el componente permite adaptar. */
export type CalendarMode = 'full' | 'dashboard' | 'patient';

/**
 * Estructura de modelado intermedio para clasificar objetos de cita en un día preciso del calendario.
 *
 * @interface DiaCal
 */
interface DiaCal {
  fecha: Date;
  esDelMes: boolean;
  citas: Cita[];
}

/**
 * El Componente universal, robusto e inyectable que encapsula a lógica, dibujo (css grid) 
 * y gestión de peticiones de citas mostradas al estilo cuadrícula-calendario (vista mensual).
 * Responde y se amolda dependiendo del modo ('full', 'dashboard', 'patient').
 *
 * @export
 * @class UniversalCalendar
 * @implements {OnInit}
 * @implements {OnDestroy}
 * @implements {OnChanges}
 */
@Component({
  selector: 'app-universal-calendar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonBadge, CitaCard],
  templateUrl: './universal-calendar.html',
  styleUrls: ['./universal-calendar.css'],
})
export class UniversalCalendar implements OnInit, OnDestroy, OnChanges {
  /** Modo de comportamiento que el CSS y el Typescript emplean para limitarse o expandirse. */
  @Input() mode: CalendarMode = 'full';
  /** Base externa (para uso reactivo) si las citas se pasaran por prop en vez de bajarlas del server aquí. */
  @Input() citasInput: Cita[] = [];
  /** Despierta los botones (o no) relativos a generación de facturas en caso de ser pasadas / completadas. */
  @Input() puedeFacturar = true;
  /** Marca la diferencia de permisos de UI indicando si quien navega la app en la sesión es 'Paciente'. */
  @Input() esPaciente = false;

  /** Dispara instrucción delegada al contenedor padre para invocar la creación sobre una celda fecha en concreto. */
  @Output() nuevaCita = new EventEmitter<string>();
  /** Informa qué elemento fue seleccionado para editar. */
  @Output() editarCita = new EventEmitter<Cita>();
  /** Informa sobre un click (Modo Paciente/Dashboard general). */
  @Output() citaSeleccionada = new EventEmitter<Cita>();
  /** Deriva al padre la petición de emitir documentación contable. */
  @Output() facturarCita = new EventEmitter<Cita>();
  /** Delega acción de borrado total. */
  @Output() eliminarCita = new EventEmitter<Cita>();

  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  semanas: DiaCal[][] = [];
  citas: Cita[] = [];
  diaSeleccionado: Date | null = null;
  citasDelDia: Cita[] = [];
  cargando = false;
  nutricionistaId = '';

  /** Cabecera estandarizada para las cuadrículas HTML. */
  readonly DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  private channel?: RealtimeChannel;
  private cdr = inject(ChangeDetectorRef);
  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);

  /** Configura importaciones gráficas del DOM SVG icons de ionic. */
  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      addCircleOutline,
      calendarOutline,
      videocamOutline,
      locationOutline,
      documentTextOutline,
      trashOutline,
    });
  }

  /**
   * Se inicia detectando el "Modo". Si es externo (`patient`) espera los props asíncronos.
   * En su defecto es autónomo: extrae UUID, carga citas de base de datos de manera
   * masiva por su mes, modela la cuadrícula y finalmente se ancla al Websocket.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    if (this.mode === 'patient') {
      this.citas = this.citasInput;
      this.construirCalendario();
      this.seleccionarFecha(this.hoy);
    } else {
      this.nutricionistaId = (await this.authService.getNutricionistaId()) ?? '';
      await this.cargarMes();
      this.seleccionarFecha(this.hoy);
      this.suscribirRealtime();
    }
  }

  /**
   * Monitor pasivo. Interviene solo si se inyectan nuevos valores (citas) provenientes del padre 
   * bajo el modo `patient` que depende de que sea él el que cambie.
   *
   * @param {SimpleChanges} changes - Cambios en props trackeados en Angular.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['citasInput'] && this.mode === 'patient') {
      this.citas = this.citasInput;
      this.construirCalendario();
      if (this.diaSeleccionado) {
        this.citasDelDia = this.citasEnFecha(this.diaSeleccionado);
      }
      this.cdr.detectChanges();
    }
  }

  /** Vacía variables persistentes (Canal supabase) para anular posibles leaks si se destruye la app. */
  ngOnDestroy() {
    this.channel?.unsubscribe();
  }

  /**
   * Extrae la suma total de citas agendadas desde la primera semana a la última
   * del mes local actual renderizado. Dispara un remonte visual.
   *
   * @returns {Promise<void>}
   */
  async cargarMes() {
    this.cargando = true;
    this.cdr.markForCheck();
    try {
      this.citas = await this.citasService.getCitasMes(
        this.nutricionistaId,
        this.mesActual.getFullYear(),
        this.mesActual.getMonth(),
      );
      this.construirCalendario();
      if (this.diaSeleccionado) this.seleccionarFecha(this.diaSeleccionado);
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Re-lanza una petición GET al server (cargarMes) cada vez que Supabase en la nube
   * le reporte por su canal de Realtime que hubo insert o update ajenos.
   *
   * @private
   */
  private suscribirRealtime() {
    this.channel = this.citasService.suscribirCambios(this.nutricionistaId, () => this.cargarMes());
  }

  /**
    * Matemáticas visuales de la vista de calendario. Llena con objetos Date falsos (grises)
    * antes o después de la primera semana si el mes no empieza el lunes (1).
    * Al final agrupa los 35-42 días concebidos en sets de 7 y los expone.
    */
  construirCalendario() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const dias: DiaCal[] = [];

    const primerDia = new Date(año, mes, 1);
    const offsetInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;

    for (let i = offsetInicio; i > 0; i--) {
      const f = new Date(año, mes, 1 - i);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    for (let d = 1; d <= ultimoDia; d++) {
      const f = new Date(año, mes, d);
      dias.push({ fecha: f, esDelMes: true, citas: this.citasEnFecha(f) });
    }

    let cont = 1;
    while (dias.length % 7 !== 0) {
      dias.push({ fecha: new Date(año, mes + 1, cont++), esDelMes: false, citas: [] });
    }

    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  /**
   * Retorna desde el conjunto global pre-cacheado de todo el mes un trozo
   * acotando exclusivamente las del día provisto.
   *
   * @private
   * @param {Date} fecha - Criterio para el `.filter`.
   * @returns {Cita[]}
   */
  private citasEnFecha(fecha: Date): Cita[] {
    return (this.citas ?? []).filter(
      (c) => new Date(c.fecha_hora).toDateString() === fecha.toDateString(),
    );
  }

  /**
   * Fija la marca verde iluminada y rellena los datos expuestos del recuadro inferior de citas.
   *
   * @param {Date} fecha - Nueva fecha destino.
   */
  seleccionarFecha(fecha: Date) {
    this.diaSeleccionado = fecha;
    this.citasDelDia = this.citasEnFecha(fecha);
    this.cdr.markForCheck();
  }

  /** Manipula la fecha global restando -1 al mes, obligando de paso a recalcular la matriz. */
  async mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    if (this.mode === 'patient') {
      this.construirCalendario();
    } else {
      await this.cargarMes();
    }
  }

  /** Manipula la fecha global sumando +1 al mes, obligando a rehacer los vectores HTML. */
  async mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    if (this.mode === 'patient') {
      this.construirCalendario();
    } else {
      await this.cargarMes();
    }
  }

  /**
   * Al interactuar en una fila de cita listada abajo en el detalle.
   * Redirige u emite según en qué ambiente haya sido colocado el calendario componente.
   *
   * @param {Cita} cita - Referencia al objeto de reserva médica.
   */
  onCitaClick(cita: Cita) {
    if (this.mode === 'patient') {
      this.citaSeleccionada.emit(cita);
    } else {
      this.router.navigate(['/pacientes', cita.paciente_id]);
    }
  }

  /**
   * Accionado al presionar "+ Añadir". Instancia un Popup/Overlay con el componente
   * ModalCita pasándole los presets base requeridos (Día, mes y id) y en caso
   * de ser guardado internamente lanza el trigger de repintado asíncrono para que asome el circulo naranja nuevo en tiempo real.
   *
   * @returns {Promise<void>}
   */
  async onNuevaCita() {
    const targetDate = this.diaSeleccionado || this.hoy;
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const fechaInicial = `${year}-${month}-${day}`;

    if (this.mode === 'full') {
      const modal = await this.modalCtrl.create({
        component: ModalCitaComponent,
        componentProps: {
          nutricionistaId: this.nutricionistaId,
          fechaSeleccionada: fechaInicial,
        },
        breakpoints: [0, 0.95],
        initialBreakpoint: 0.95,
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === 'guardado') await this.cargarMes();
    } else {
      this.nuevaCita.emit(fechaInicial);
    }
  }

  /**
   * Comparador para agregar CSS "Hoy" a un recuadro.
   * @param {Date} f
   * @returns {boolean}
   */
  esHoy(f: Date) {
    return f.toDateString() === this.hoy.toDateString();
  }
  /**
   * Comparador para agregar el borde CSS Verde "seleccionado" que enfoca detalles abajo.
   * @param {Date} f
   * @returns {boolean}
   */
  esSeleccionado(f: Date) {
    return this.diaSeleccionado?.toDateString() === f.toDateString();
  }

  /**
   * Determina si para el día pasado como parámetro tiene dentro de su array interno
   * un registro en un estado específico para poder pintarle un circulito ('dot').
   * @param {DiaCal} dia
   * @param {string} estado
   * @returns {boolean}
   */
  tieneEstado(dia: DiaCal, estado: string) {
    return dia.citas.some((c) => c.estado === estado);
  }

  /**
   * Devuelve color badge Ionic asociado al tipo de estado en texto.
   * @param {string} estado
   * @returns {string}
   */
  colorEstado(estado: string) {
    return { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[estado] ?? 'medium';
  }

  /** Determina si es pertinente visualizar el texto superior "+ Añadir". */
  get mostrarBotonNueva() {
    if (this.mode !== 'patient' && this.mode !== 'full') return false;

    // 🛡️ PROTECCIÓN UX: Ocultar el botón "+ Añadir" si el día seleccionado ya es pasado
    if (this.diaSeleccionado) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Quitamos la hora para comparar solo días

      const seleccionado = new Date(this.diaSeleccionado);
      seleccionado.setHours(0, 0, 0, 0);

      if (seleccionado.getTime() < hoy.getTime()) {
        return false; // El día ya ha pasado, no se pueden pedir citas
      }
    }

    return true;
  }

  /** Determina el formato con el que escupirá la lista inferior al pinchar una casilla. */
  get usaCitaCard() {
    return this.mode === 'patient';
  }

  /**
   * Operador tiempo condicional de UI simple (No se pueden facturar cosas que no han sucedido en reloj cronológico aún).
   * @param {Cita} cita
   * @returns {boolean}
   */
  citaPasada(cita: Cita): boolean {
    return new Date(cita.fecha_hora).getTime() < new Date().getTime();
  }

  /**
   * Detiene que el clic repercuta sobre el contenedor de Cita para
   * interceptarlo por encima como un Output delegable de Event Emitter al padre.
   * @param {Event} event - JS click event nativo DOM.
   * @param {Cita} cita - Payload arrastrado.
   */
  emitirFacturaEvent(event: Event, cita: Cita) {
    event.stopPropagation();
    this.facturarCita.emit(cita);
  }
}