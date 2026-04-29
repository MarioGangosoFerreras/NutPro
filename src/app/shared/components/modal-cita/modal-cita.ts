import { ChangeDetectorRef, Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonSpinner, ModalController, IonSearchbar, IonList, IonAvatar,
  IonIcon, IonChip
} from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';
import { PacientesService } from '../../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonContent, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonSpinner, IonSearchbar, IonList,
    IonAvatar, IonIcon, IonChip,
  ],
  templateUrl: './modal-cita.html',
  styleUrls: ['./modal-cita.css'],
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId?: string;
  @Input() nutricionistaId!: string;
  @Input() esPaciente = false;
  @Input() fechaSeleccionada?: string; // Recibe la fecha predeterminada desde el calendario

  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);
  private cdr = inject(ChangeDetectorRef);

  guardando = false;

  // Variables del formulario
  fecha = '';
  hora = '';
  duracion = 30; // Por defecto empezamos en 30
  tipo: 'presencial' | 'videollamada' = 'presencial';
  estado: 'pendiente' | 'confirmada' | 'cancelada' = 'pendiente';
  notas = '';
  urlVideo = '';

  // Opciones estándar de duración
  opcionesDuracion = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 }
  ];

  // CONSTANTES DE HORARIO Y MÁRGENES
  readonly MARGEN_MINUTOS = 0;          // Citas consecutivas sin descanso (ej: 9:00 - 9:30 y 9:30 - 10:30)
  readonly HORA_INICIO_MANANA = 9 * 60; // 09:00 (en minutos desde las 00:00)
  readonly HORA_FIN_MANANA = 15 * 60;   // 15:00
  readonly HORA_INICIO_TARDE = 16 * 60; // 16:00
  readonly HORA_FIN_TARDE = 21 * 60;    // 21:00

  horasDisponibles: string[] = [];
  citasDelDiaSeleccionado: any[] = [];

  // Lógica del buscador de pacientes
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  pacienteSeleccionadoId = '';
  pacienteSeleccionadoNombre = '';

  get esEdicion() { return !!this.cita?.id; }
  get titulo() { return this.esEdicion ? 'Editar cita' : 'Nueva cita'; }

  constructor() {
    addIcons({ checkmarkCircle, closeCircleOutline, personCircleOutline });
  }

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

  async cargarCitasDelDia(fechaIso: string) {
    try {
      const todas = await this.citasService.getHorariosOcupadosNutricionista(this.nutricionistaId);
      this.citasDelDiaSeleccionado = todas.filter(c => c.fecha_hora.startsWith(fechaIso));
      this.recalcularHoras();
    } catch (e) {
      console.error('Error al obtener horarios', e);
    } finally {
      // ESTO ES LO QUE OBLIGA A LA PANTALLA A DIBUJAR LAS HORAS AUTOMÁTICAMENTE
      this.cdr.detectChanges(); 
    }
  }

  async onFechaCambiada(event: any, esCargaInicial = false) {
    const val = event.detail?.value || event;
    if (!val) return;

    this.fecha = val.split('T')[0];
    if (!esCargaInicial) this.hora = ''; 
    await this.cargarCitasDelDia(this.fecha);
  }

  recalcularHoras() {
    if (!this.fecha) return;

    const duracionMinima = 30;

    const intervalosOcupados = this.citasDelDiaSeleccionado.map(cita => {
      if (this.esEdicion && this.cita?.id === cita.id) return null;
      
      const d = new Date(cita.fecha_hora);
      const start = d.getHours() * 60 + d.getMinutes();
      return { start, end: start + (cita.duracion_min || 30) + this.MARGEN_MINUTOS };
    }).filter(i => i !== null) as {start: number, end: number}[];

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

  private esSlotLibre(start: number, end: number, ocupados: {start: number, end: number}[]): boolean {
    for (const o of ocupados) {
      // Hay solapamiento si mi hora de inicio es menor que el fin de otra, y mi fin es mayor que el inicio de otra
      if (start < o.end && end > o.start) {
        return false;
      }
    }
    return true;
  }

  // Valida si la duración seleccionada "cabe" antes de la próxima cita
  esDuracionValida(duracionCandidata: number): boolean {
    if (!this.hora) return true; // Si no ha elegido hora, no podemos saberlo
    
    const [h, m] = this.hora.split(':').map(Number);
    const inicioSelected = h * 60 + m;
    const finCandidato = inicioSelected + duracionCandidata;

    // Buscamos todas las citas que empiecen DESPUÉS de la hora que ha elegido
    const intervalosOcupados = this.citasDelDiaSeleccionado.map(cita => {
        if (this.esEdicion && this.cita?.id === cita.id) return null;
        const d = new Date(cita.fecha_hora);
        return d.getHours() * 60 + d.getMinutes();
    }).filter(start => start !== null && start > inicioSelected) as number[];

    if (intervalosOcupados.length === 0) return true; // No hay más citas hoy después de esta

    // La cita más próxima que empieza después de la hora seleccionada
    const proximaCitaStart = Math.min(...intervalosOcupados);

    // Es válido si nuestra cita candidata (más el margen) termina a la misma hora o antes que empiece la siguiente
    return (finCandidato + this.MARGEN_MINUTOS) <= proximaCitaStart;
  }

  private minutosAHora(m: number): string {
    const horas = Math.floor(m / 60).toString().padStart(2, '0');
    const mins = (m % 60).toString().padStart(2, '0');
    return `${horas}:${mins}`;
  }

  async cargarPacientes() {
    const data = await this.pacientesService.getPacientes(this.nutricionistaId);
    this.pacientes.set(data || []);
    this.pacientesFiltrados.set(data || []);
  }

  filtrarPacientes(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    const filtrados = this.pacientes().filter((p) =>
      `${p.usuario?.nombre} ${p.usuario?.apellidos}`.toLowerCase().includes(query),
    );
    this.pacientesFiltrados.set(filtrados);
  }

  seleccionarPaciente(p: any) {
    this.pacienteSeleccionadoId = p.id;
    this.pacienteSeleccionadoNombre = `${p.usuario?.nombre} ${p.usuario?.apellidos}`;
  }

  quitarPaciente() {
    this.pacienteSeleccionadoId = '';
    this.pacienteSeleccionadoNombre = '';
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancelado');
  }

  async guardar() {
    if (!this.fecha || !this.hora || !this.pacienteSeleccionadoId) return;

    this.guardando = true;
    try {
      const fecha_hora = new Date(`${this.fecha}T${this.hora}`).toISOString();

      const payload: Omit<Cita, 'id'> = {
        paciente_id: this.pacienteSeleccionadoId,
        nutricionista_id: this.nutricionistaId,
        fecha_hora,
        duracion_min: this.duracion,
        tipo: this.tipo,
        estado: this.esPaciente ? 'pendiente' : this.estado,
        notas: this.notas || undefined,
        url_videollamada: this.tipo === 'videollamada' ? this.urlVideo || undefined : undefined,
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