// universal-calendar.component.ts
import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges,
  inject, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonButton, IonIcon, IonBadge, IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, chevronForwardOutline,
  addCircleOutline, calendarOutline,
  videocamOutline, locationOutline
} from 'ionicons/icons';
import { CitasService, Cita } from '../../../core/services/citas';
import { AuthService } from '../../../core/services/auth';
import { CitaCard } from '../cita-card/cita-card';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ModalCitaComponent } from '../modal-cita/modal-cita';

export type CalendarMode = 'full' | 'dashboard' | 'patient';

interface DiaCal {
  fecha: Date;
  esDelMes: boolean;
  citas: Cita[];
}

@Component({
  selector: 'app-universal-calendar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonBadge, IonSpinner, CitaCard],
  templateUrl: './universal-calendar.html',
  styleUrls: ['./universal-calendar.css'],
})
export class UniversalCalendar implements OnInit, OnDestroy, OnChanges {

  // ── Modo de uso ─────────────────────────────────────────────────────────
  // 'full'    → vista /citas del menú lateral (carga sus propias citas)
  // 'dashboard' → widget compacto del dashboard (carga sus propias citas)
  // 'patient' → ficha del paciente (recibe citas por @Input)
  @Input() mode: CalendarMode = 'full';

  // Solo en mode='patient': recibe las citas ya filtradas desde el padre
  @Input() citasInput: Cita[] = [];

  // Solo en mode='patient': para el botón "Añadir cita"
  @Output() nuevaCita = new EventEmitter<void>();

  // Solo en mode='patient': al pulsar editar en una CitaCard
  @Output() editarCita = new EventEmitter<Cita>();

  // En mode='full' y 'dashboard': al pulsar una cita navega al paciente
  // En mode='patient': no se usa (el padre controla la navegación)
  @Output() citaSeleccionada = new EventEmitter<Cita>();

  // ── Estado interno ───────────────────────────────────────────────────────
  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  semanas: DiaCal[][] = [];
  citas: Cita[] = [];          // citas cargadas internamente (full/dashboard)
  diaSeleccionado: Date | null = null;
  citasDelDia: Cita[] = [];
  cargando = false;
  nutricionistaId = '';

  readonly DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  private channel?: RealtimeChannel;
  private cdr = inject(ChangeDetectorRef);
  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({
      chevronBackOutline, chevronForwardOutline,
      addCircleOutline, calendarOutline,
      videocamOutline, locationOutline
    });
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  async ngOnInit() {
    if (this.mode === 'patient') {
      // Las citas vienen del padre, no cargamos nada
      this.citas = this.citasInput;
      this.construirCalendario();
      this.seleccionarFecha(this.hoy);
    } else {
      // full o dashboard: cargamos nosotros
      this.nutricionistaId = (await this.authService.getNutricionistaId()) ?? '';
      await this.cargarMes();
      this.seleccionarFecha(this.hoy);
      this.suscribirRealtime();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Solo aplica en mode='patient' cuando el padre actualiza las citas
    if (changes['citasInput'] && this.mode === 'patient') {
      this.citas = this.citasInput;
      this.construirCalendario();
      if (this.diaSeleccionado) {
        this.citasDelDia = this.citasEnFecha(this.diaSeleccionado);
      }
    }
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

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

  private suscribirRealtime() {
    this.channel = this.citasService.suscribirCambios(
      this.nutricionistaId,
      () => this.cargarMes()
    );
  }

  // ── Construcción del calendario ──────────────────────────────────────────

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

  private citasEnFecha(fecha: Date): Cita[] {
    return (this.citas ?? []).filter(c =>
      new Date(c.fecha_hora).toDateString() === fecha.toDateString()
    );
  }

  // ── Interacción ──────────────────────────────────────────────────────────

  seleccionarFecha(fecha: Date) {
    this.diaSeleccionado = fecha;
    this.citasDelDia = this.citasEnFecha(fecha);
    this.cdr.markForCheck();
  }

  async mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    if (this.mode === 'patient') {
      this.construirCalendario();
    } else {
      await this.cargarMes();
    }
  }

  async mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    if (this.mode === 'patient') {
      this.construirCalendario();
    } else {
      await this.cargarMes();
    }
  }

  onCitaClick(cita: Cita) {
    if (this.mode === 'patient') {
      // El padre maneja la lógica; aquí no navegamos
      this.citaSeleccionada.emit(cita);
    } else {
      this.router.navigate(['/pacientes', cita.paciente_id]);
    }
  }

  async onNuevaCita() {
    if (this.mode === 'full') {
      const modal = await this.modalCtrl.create({
        component: ModalCitaComponent,
        componentProps: { nutricionistaId: this.nutricionistaId },
        breakpoints: [0, 0.95],
        initialBreakpoint: 0.95,
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === 'guardado') await this.cargarMes();
    } else {
      this.nuevaCita.emit();
    }
  }

  // ── Helpers de vista ─────────────────────────────────────────────────────

  esHoy(f: Date) { return f.toDateString() === this.hoy.toDateString(); }
  esSeleccionado(f: Date) { return this.diaSeleccionado?.toDateString() === f.toDateString(); }

  tieneEstado(dia: DiaCal, estado: string) {
    return dia.citas.some(c => c.estado === estado);
  }

  colorEstado(estado: string) {
    return { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[estado] ?? 'medium';
  }

  // Solo en mode='full': muestra botón de nueva cita
  get mostrarBotonNueva() { return this.mode === 'full' || this.mode === 'patient'; }

  // El panel de detalle de cita usa CitaCard en 'patient', filas simples en el resto
  get usaCitaCard() { return this.mode === 'patient'; }
}