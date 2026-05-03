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

export type CalendarMode = 'full' | 'dashboard' | 'patient';

interface DiaCal {
  fecha: Date;
  esDelMes: boolean;
  citas: Cita[];
}

@Component({
  selector: 'app-universal-calendar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonBadge, CitaCard],
  templateUrl: './universal-calendar.html',
  styleUrls: ['./universal-calendar.css'],
})
export class UniversalCalendar implements OnInit, OnDestroy, OnChanges {
  @Input() mode: CalendarMode = 'full';
  @Input() citasInput: Cita[] = [];
  @Input() puedeFacturar = true;
  @Input() esPaciente = false; // <-- NUEVO: Para identificar si estamos en el portal del paciente

  @Output() nuevaCita = new EventEmitter<string>();
  @Output() editarCita = new EventEmitter<Cita>();
  @Output() citaSeleccionada = new EventEmitter<Cita>();
  @Output() facturarCita = new EventEmitter<Cita>();
  @Output() eliminarCita = new EventEmitter<Cita>();

  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  semanas: DiaCal[][] = [];
  citas: Cita[] = [];
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

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }

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
    this.channel = this.citasService.suscribirCambios(this.nutricionistaId, () => this.cargarMes());
  }

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
    return (this.citas ?? []).filter(
      (c) => new Date(c.fecha_hora).toDateString() === fecha.toDateString(),
    );
  }

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
      this.citaSeleccionada.emit(cita);
    } else {
      this.router.navigate(['/pacientes', cita.paciente_id]);
    }
  }

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

  esHoy(f: Date) {
    return f.toDateString() === this.hoy.toDateString();
  }
  esSeleccionado(f: Date) {
    return this.diaSeleccionado?.toDateString() === f.toDateString();
  }

  tieneEstado(dia: DiaCal, estado: string) {
    return dia.citas.some((c) => c.estado === estado);
  }

  colorEstado(estado: string) {
    return { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[estado] ?? 'medium';
  }

  get mostrarBotonNueva() {
    return this.mode === 'patient' || this.mode === 'full';
  }

  get usaCitaCard() {
    return this.mode === 'patient';
  }

  citaPasada(cita: Cita): boolean {
    return new Date(cita.fecha_hora).getTime() < new Date().getTime();
  }

  emitirFacturaEvent(event: Event, cita: Cita) {
    event.stopPropagation();
    this.facturarCita.emit(cita);
  }
}
