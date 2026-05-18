import { ChangeDetectorRef, Component, Input, OnInit, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonTextarea, IonSpinner, ModalController, IonSearchbar, IonList, IonAvatar, IonIcon, IonChip, IonDatetime, IonFooter } from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';
import { PacientesService } from '../../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

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
    IonDatetime,
    IonFooter
],
  templateUrl: './modal-cita.html',
  styleUrls: ['./modal-cita.css'],
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId?: string;
  @Input() nutricionistaId!: string;
  @Input() esPaciente = false;
  @Input() fechaSeleccionada?: string;

  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  guardando = false;
  cargandoHoras = false; 
    
  fecha = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  fechaLimpiaPrevia = ''; 

  hora = '';
  duracion = 30;
  tipo: 'presencial' | 'videollamada' = 'presencial';
  estado: 'pendiente' | 'confirmada' | 'cancelada' = 'pendiente';
  notas = '';
  urlVideo = '';

  opcionesDuracion = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 },
  ];

  readonly MARGEN_MINUTOS = 0;
  readonly HORA_INICIO_MANANA = 9 * 60;
  readonly HORA_FIN_MANANA = 15 * 60;
  readonly HORA_INICIO_TARDE = 16 * 60;
  readonly HORA_FIN_TARDE = 21 * 60;

  horasDisponibles: string[] = [];
  citasDelDiaSeleccionado: any[] = [];

  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  pacienteSeleccionadoId = '';
  pacienteSeleccionadoNombre = '';

  get esEdicion() { return !!this.cita?.id; }
  get titulo() { return this.esEdicion ? 'Editar cita' : 'Nueva cita'; }

  get minDateCita(): string {
    if (this.esEdicion) {
      return '2000-01-01'; 
    }
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().split('T')[0];
  }

  constructor() {
    addIcons({ checkmarkCircle, closeCircleOutline, personCircleOutline });
  }

  async ngOnInit() {
    this.pacienteSeleccionadoId = this.pacienteId || '';
    if (!this.pacienteSeleccionadoId) this.cargarPacientes();

    if (this.cita) {
      const d = new Date(this.cita.fecha_hora);
      this.fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.hora = d.toTimeString().slice(0, 5);
      this.duracion = this.cita.duracion_min;
      this.tipo = this.cita.tipo;
      this.estado = this.cita.estado;
      this.notas = this.cita.notas ?? '';
      this.urlVideo = this.cita.url_videollamada ?? '';
      this.pacienteSeleccionadoId = this.cita.paciente_id;
    } else if (this.fechaSeleccionada) {
      this.fecha = this.fechaSeleccionada.split('T')[0]; 
    }

    if (this.fecha) {
      this.fechaLimpiaPrevia = this.fecha.split('T')[0];
      await this.cargarCitasDelDia(this.fechaLimpiaPrevia);
    }
  }

  async cargarCitasDelDia(fechaIso: string) {
    this.cargandoHoras = true;
    this.horasDisponibles = [];
    this.cdr.detectChanges(); 
    
    try {
      const fechaLimpia = fechaIso.split('T')[0]; 
      const todas = await this.citasService.getHorariosOcupadosNutricionista(this.nutricionistaId);
      this.citasDelDiaSeleccionado = todas.filter((c) => c.fecha_hora.startsWith(fechaLimpia));
      this.recalcularHoras(fechaLimpia);
    } catch (e) {
      console.error('Error al obtener horarios', e);
    } finally {
      this.cargandoHoras = false;
      this.cdr.detectChanges(); 
    }
  }

  onFechaCambiada(event: any) {
    const val = event.detail?.value;
    if (!val) return;
    
    const nuevaFecha = val.split('T')[0];

    if (this.fechaLimpiaPrevia === nuevaFecha) return;
    
    // 🔥 SOLUCIÓN DOBLE CLIC: Forzamos la zona de Angular de forma instantánea
    this.ngZone.run(() => {
      this.fechaLimpiaPrevia = nuevaFecha;
      this.fecha = nuevaFecha; 
      this.hora = ''; 
      this.cargarCitasDelDia(nuevaFecha);
    });
  }

  recalcularHoras(fechaLimpia: string) {
    if (!this.fecha) return;
    
    // 🔥 SOLUCIÓN HORAS: Usamos la fecha limpia para que detecte correctamente si es HOY
    const duracionMinima = 30;
    const ahora = new Date();
    const tzoffset = ahora.getTimezoneOffset() * 60000;
    const hoyLocal = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
    
    const esHoy = fechaLimpia === hoyLocal;
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

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
        if (esHoy && t <= minutosActuales) continue;
        if (this.esSlotLibre(t, t + duracionMinima, intervalosOcupados)) {
          slots.push(this.minutosAHora(t));
        }
      }
    };

    verificarBloque(this.HORA_INICIO_MANANA, this.HORA_FIN_MANANA);
    verificarBloque(this.HORA_INICIO_TARDE, this.HORA_FIN_TARDE);
    this.horasDisponibles = slots;
    
    if (this.hora && !this.horasDisponibles.includes(this.hora)) this.hora = '';
    this.cdr.detectChanges();
  }

  private esSlotLibre(start: number, end: number, ocupados: { start: number; end: number }[]): boolean {
    for (const o of ocupados) {
      if (start < o.end && end > o.start) return false;
    }
    return true;
  }

  esDuracionValida(duracionCandidata: number): boolean {
    if (!this.hora) return true;
    const [h, m] = this.hora.split(':').map(Number);
    const inicioSelected = h * 60 + m;
    const finCandidato = inicioSelected + duracionCandidata;
    const intervalosOcupados = this.citasDelDiaSeleccionado
      .map((cita) => {
        if (this.esEdicion && this.cita?.id === cita.id) return null;
        const d = new Date(cita.fecha_hora);
        return d.getHours() * 60 + d.getMinutes();
      })
      .filter((start) => start !== null && start > inicioSelected) as number[];

    if (intervalosOcupados.length === 0) return true;
    const proximaCitaStart = Math.min(...intervalosOcupados);
    return finCandidato + this.MARGEN_MINUTOS <= proximaCitaStart;
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

  cancelar() { this.modalCtrl.dismiss(null, 'cancelado'); }

  async guardar() {
    if (!this.fecha || !this.hora || !this.pacienteSeleccionadoId) return;
    this.guardando = true;
    try {
      const fechaLimpia = this.fecha.split('T')[0];
      const fecha_hora = new Date(`${fechaLimpia}T${this.hora}`).toISOString();
      const payload: Omit<Cita, 'id'> = {
        paciente_id: this.pacienteSeleccionadoId,
        nutricionista_id: this.nutricionistaId,
        fecha_hora,
        duracion_min: this.duracion,
        tipo: this.tipo,
        estado: this.esPaciente ? 'pendiente' : this.estado,
        notas: this.notas || undefined,
        url_videollamada: this.tipo === 'videollamada' && !this.esPaciente ? this.urlVideo || undefined : undefined,
      };

      if (this.esEdicion) await this.citasService.editarCita(this.cita!.id!, payload);
      else await this.citasService.crearCita(payload);
      await this.modalCtrl.dismiss(null, 'guardado');
    } finally {
      this.guardando = false;
    }
  }
}