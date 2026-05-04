import { ChangeDetectorRef, Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonSpinner,
  ModalController,
  IonSearchbar,
  IonList,
  IonAvatar,
  IonIcon,
  IonChip,
} from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';
import { PacientesService } from '../../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

/**
 * Componente Modal para crear o editar una cita médica.
 * Incluye lógica avanzada para calcular intervalos de horas disponibles, 
 * buscar pacientes (si se crea desde el dashboard general) y validar duraciones.
 *
 * @export
 * @class ModalCitaComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonSpinner,
    IonSearchbar,
    IonList,
    IonAvatar,
    IonIcon,
    IonChip,
  ],
  templateUrl: './modal-cita.html',
  styleUrls: ['./modal-cita.css'],
})
export class ModalCitaComponent implements OnInit {
  /** Objeto con los datos de la cita existente (si estamos en modo edición). */
  @Input() cita?: Cita;
  /** ID del paciente. Si se proporciona, se omite el buscador de pacientes. */
  @Input() pacienteId?: string;
  /** ID del nutricionista que va a atender la consulta. */
  @Input() nutricionistaId!: string;
  /** Bandera que indica si el propio paciente está creando/viendo este modal. */
  @Input() esPaciente = false;
  /** Fecha inicial preseleccionada si el usuario tocó un día concreto en el calendario. */
  @Input() fechaSeleccionada?: string; // Recibe la fecha predeterminada desde el calendario

  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);
  private cdr = inject(ChangeDetectorRef);

  guardando = false;

  /**  Variables del formulario */
  fecha = '';
  hora = '';
  duracion = 30; // Por defecto empezamos en 30
  /** Modalidad de la cita. */
  tipo: 'presencial' | 'videollamada' = 'presencial';
  /** Estado del ciclo de vida de la cita. */
  estado: 'pendiente' | 'confirmada' | 'cancelada' = 'pendiente';
  /** Observaciones adicionales. */
  notas = '';
  /** URL de la sala de reuniones virtuales, si aplica. */
  urlVideo = '';

  // Opciones estándar de duración
  /** Array de duraciones disponibles para poblar el elemento IonSelect. */
  opcionesDuracion = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 },
  ];

  // CONSTANTES DE HORARIO Y MÁRGENES
  readonly MARGEN_MINUTOS = 0; // Citas consecutivas sin descanso (ej: 9:00 - 9:30 y 9:30 - 10:30)
  readonly HORA_INICIO_MANANA = 9 * 60; 
  readonly HORA_FIN_MANANA = 15 * 60; 
  readonly HORA_INICIO_TARDE = 16 * 60; 
  readonly HORA_FIN_TARDE = 21 * 60; 

  /** Lista calculada de horas (strings) en las que se puede agendar una cita. */
  horasDisponibles: string[] = [];
  /** Array temporal con las citas ya reservadas para el día que se ha seleccionado en el formulario. */
  citasDelDiaSeleccionado: any[] = [];

  // Lógica del buscador de pacientes
  /** Señal con la lista completa de pacientes asociados al nutricionista. */
  pacientes = signal<any[]>([]);
  /** Señal con los resultados del buscador. */
  pacientesFiltrados = signal<any[]>([]);
  /** Almacena el ID del paciente seleccionado en el buscador interno. */
  pacienteSeleccionadoId = '';
  /** Muestra en la UI el nombre del paciente tras seleccionarlo del buscador. */
  pacienteSeleccionadoNombre = '';

  /**
   * Determina si el modal está operando sobre una cita existente.
   *
   * @readonly
   * @type {boolean}
   */
  get esEdicion() {
    return !!this.cita?.id;
  }

  /**
   * Retorna el texto del encabezado del modal en función del modo (Crear/Editar).
   *
   * @readonly
   * @type {string}
   */
  get titulo() {
    return this.esEdicion ? 'Editar cita' : 'Nueva cita';
  }

  /**
   * Crea una instancia de ModalCitaComponent y registra los iconos usados.
   */
  constructor() {
    addIcons({ checkmarkCircle, closeCircleOutline, personCircleOutline });
  }

  /**
   * Inicializa el formulario poblador los datos (si es edición) o las propiedades 
   * iniciales. Carga también las citas del día para calcular huecos libres.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    this.pacienteSeleccionadoId = this.pacienteId || '';

    if (!this.pacienteSeleccionadoId) {
      this.cargarPacientes();
    }

    if (this.cita) {
      const d = new Date(this.cita.fecha_hora);
      // Evitamos el bug de UTC también aquí
      this.fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.hora = d.toTimeString().slice(0, 5);
      this.duracion = this.cita.duracion_min;
      this.tipo = this.cita.tipo;
      this.estado = this.cita.estado;
      this.notas = this.cita.notas ?? '';
      this.urlVideo = this.cita.url_videollamada ?? '';
      this.pacienteSeleccionadoId = this.cita.paciente_id;
    } else {
      this.fecha = this.fechaSeleccionada || new Date().toISOString().split('T')[0];
    }

    // CARGA DE HORAS INICIAL
    if (this.fecha) {
      await this.cargarCitasDelDia(this.fecha);
    }
  }

  /**
   * Consulta a la base de datos las horas ocupadas de un día específico 
   * y desencadena el recálculo de los espacios disponibles en la agenda.
   *
   * @param {string} fechaIso - Fecha seleccionada en formato "YYYY-MM-DD".
   * @returns {Promise<void>}
   */
  async cargarCitasDelDia(fechaIso: string) {
    try {
      const todas = await this.citasService.getHorariosOcupadosNutricionista(this.nutricionistaId);
      this.citasDelDiaSeleccionado = todas.filter((c) => c.fecha_hora.startsWith(fechaIso));
      this.recalcularHoras();
    } catch (e) {
      console.error('Error al obtener horarios', e);
    } finally {
      // ESTO ES LO QUE OBLIGA A LA PANTALLA A DIBUJAR LAS HORAS AUTOMÁTICAMENTE
      this.cdr.detectChanges();
    }
  }

  /**
   * Evento lanzado al cambiar el input del día en la UI.
   * Vacía la hora actualmente escogida (si aplica) y consulta las citas del nuevo día.
   *
   * @param {*} event - Evento nativo de Ionic con el valor de la nueva fecha.
   * @param {boolean} [esCargaInicial=false] - Define si la llamada se hace programáticamente durante el init.
   * @returns {Promise<void>}
   */
  async onFechaCambiada(event: any, esCargaInicial = false) {
    const val = event.detail?.value || event;
    if (!val) return;

    this.fecha = val.split('T')[0];
    if (!esCargaInicial) this.hora = '';
    await this.cargarCitasDelDia(this.fecha);
  }

  /**
   * Ejecuta el algoritmo de disponibilidad para trocear la jornada laboral en 
   * fracciones (slots) de 15 minutos e invalidar aquellas donde exista superposición 
   * con las citas que ya constan en base de datos.
   */
  recalcularHoras() {
    if (!this.fecha) return;

    const duracionMinima = 30;

    const intervalosOcupados = this.citasDelDiaSeleccionado
      .map((cita) => {
        if (this.esEdicion && this.cita?.id === cita.id) return null;

        const d = new Date(cita.fecha_hora);
        const start = d.getHours() * 60 + d.getMinutes();
        return { start, end: start + (cita.duracion_min || 30) + this.MARGEN_MINUTOS };
      })
      .filter((i) => i !== null) as { start: number; end: number }[];

    const slots: string[] = [];

    const verificarBloque = (inicio: number, fin: number) => {
      for (let t = inicio; t <= fin - duracionMinima; t += 15) {
        if (this.esSlotLibre(t, t + duracionMinima, intervalosOcupados)) {
          slots.push(this.minutosAHora(t));
        }
      }
    };

    verificarBloque(this.HORA_INICIO_MANANA, this.HORA_FIN_MANANA);
    verificarBloque(this.HORA_INICIO_TARDE, this.HORA_FIN_TARDE);

    this.horasDisponibles = slots;

    if (this.hora && !this.horasDisponibles.includes(this.hora)) {
      this.hora = '';
    }

    this.cdr.detectChanges(); // FUERZA LA ACTUALIZACIÓN VISUAL
  }

  /**
   * Helper privado del algoritmo de disponibilidad. 
   * Verifica si un bloque de minutos entra en colisión con algún intervalo ocupado.
   *
   * @private
   * @param {number} start - Minutos transcurridos desde las 00:00 como inicio.
   * @param {number} end - Minutos de fin de bloque.
   * @param {{ start: number; end: number }[]} ocupados - Intervalos ya registrados que restringen la agenda.
   * @returns {boolean} Retorna `true` si el espacio de tiempo está despejado.
   */
  private esSlotLibre(
    start: number,
    end: number,
    ocupados: { start: number; end: number }[],
  ): boolean {
    for (const o of ocupados) {
      // Hay solapamiento si mi hora de inicio es menor que el fin de otra, y mi fin es mayor que el inicio de otra
      if (start < o.end && end > o.start) {
        return false;
      }
    }
    return true;
  }

  /**
   * Valida si el "select" de duración (ej. 60 min) tiene cabida a partir de la hora escogida, 
   * mirando si no va a chocar frontalmente con la hora de inicio de la siguiente cita programada del día.
   *
   * @param {number} duracionCandidata - Minutos escogidos en el desplegable (30, 45, 60, 90).
   * @returns {boolean} `true` si hay margen para asignar esa duración, `false` si invadiría la siguiente cita.
   */
  // Valida si la duración seleccionada "cabe" antes de la próxima cita
  esDuracionValida(duracionCandidata: number): boolean {
    if (!this.hora) return true; // Si no ha elegido hora, no podemos saberlo

    const [h, m] = this.hora.split(':').map(Number);
    const inicioSelected = h * 60 + m;
    const finCandidato = inicioSelected + duracionCandidata;

    // Buscamos todas las citas que empiecen DESPUÉS de la hora que ha elegido
    const intervalosOcupados = this.citasDelDiaSeleccionado
      .map((cita) => {
        if (this.esEdicion && this.cita?.id === cita.id) return null;
        const d = new Date(cita.fecha_hora);
        return d.getHours() * 60 + d.getMinutes();
      })
      .filter((start) => start !== null && start > inicioSelected) as number[];

    if (intervalosOcupados.length === 0) return true; // No hay más citas hoy después de esta

    // La cita más próxima que empieza después de la hora seleccionada
    const proximaCitaStart = Math.min(...intervalosOcupados);

    // Es válido si nuestra cita candidata (más el margen) termina a la misma hora o antes que empiece la siguiente
    return finCandidato + this.MARGEN_MINUTOS <= proximaCitaStart;
  }

  /**
   * Convierte un sumatorio de minutos desde la medianoche en formato legible (ej. 540 -> '09:00').
   *
   * @private
   * @param {number} m - Minutos transcurridos desde las 00:00.
   * @returns {string} String formateado como "HH:mm".
   */
  private minutosAHora(m: number): string {
    const horas = Math.floor(m / 60)
      .toString()
      .padStart(2, '0');
    const mins = (m % 60).toString().padStart(2, '0');
    return `${horas}:${mins}`;
  }

  /**
   * Consulta y guarda todos los pacientes del nutricionista asignado para poblar 
   * el buscador interno del modal en caso de que se haya lanzado desde el calendario general.
   *
   * @returns {Promise<void>}
   */
  async cargarPacientes() {
    const data = await this.pacientesService.getPacientes(this.nutricionistaId);
    this.pacientes.set(data || []);
    this.pacientesFiltrados.set(data || []);
  }

  /**
   * Filtra dinámicamente el listado de pacientes del modal según el texto ingresado.
   *
   * @param {*} event - Evento "ionInput" del searchbar.
   */
  filtrarPacientes(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    const filtrados = this.pacientes().filter((p) =>
      `${p.usuario?.nombre} ${p.usuario?.apellidos}`.toLowerCase().includes(query),
    );
    this.pacientesFiltrados.set(filtrados);
  }

  /**
   * Reacciona a la selección de un paciente de la lista. Establece el ID y contrae la vista.
   *
   * @param {*} p - Entidad completa del paciente seleccionado.
   */
  seleccionarPaciente(p: any) {
    this.pacienteSeleccionadoId = p.id;
    this.pacienteSeleccionadoNombre = `${p.usuario?.nombre} ${p.usuario?.apellidos}`;
  }

  /** Elimina el paciente que se había preseleccionado de la vista para volver a mostrar el buscador. */
  quitarPaciente() {
    this.pacienteSeleccionadoId = '';
    this.pacienteSeleccionadoNombre = '';
  }

  /** Descarta los cambios introducidos, cerrando la vista y respondiendo al padre con `cancelado`. */
  cancelar() {
    this.modalCtrl.dismiss(null, 'cancelado');
  }

  /**
   * Empaqueta el objeto "Cita" con todos sus campos completados en formato ISO,
   * y llama al servicio inyectado para INSERTAR (`crearCita`) o ACTUALIZAR (`editarCita`)
   * el registro persistente. Cierra la ventana devolviendo el role `guardado`.
   *
   * @returns {Promise<void>}
   */
  async guardar() {
    if (!this.fecha || !this.hora || !this.pacienteSeleccionadoId) return;

    this.guardando = true;
    try {
      const fecha_hora = new Date(`${this.fecha}T${this.hora}`).toISOString();

      // AQUÍ ESTÁ EL CAMBIO EN EL PAYLOAD
      const payload: Omit<Cita, 'id'> = {
        paciente_id: this.pacienteSeleccionadoId,
        nutricionista_id: this.nutricionistaId,
        fecha_hora,
        duracion_min: this.duracion,
        tipo: this.tipo,
        estado: this.esPaciente ? 'pendiente' : this.estado,
        notas: this.notas || undefined,
        // Limpiamos la URL de videollamada si quien guarda es el paciente
        url_videollamada:
          this.tipo === 'videollamada' && !this.esPaciente ? this.urlVideo || undefined : undefined,
      };

      if (this.esEdicion) {
        await this.citasService.editarCita(this.cita!.id!, payload);
      } else {
        await this.citasService.crearCita(payload);
      }

      await this.modalCtrl.dismiss(null, 'guardado');
    } finally {
      this.guardando = false;
    }
  }
}