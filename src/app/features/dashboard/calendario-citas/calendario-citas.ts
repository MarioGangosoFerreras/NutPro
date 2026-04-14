import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, calendarOutline } from 'ionicons/icons';
import { CitasService, Cita } from '../../../core/services/citas';
import { AuthService } from '../../../core/services/auth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DiaCal {
  fecha: Date;
  esDelMes: boolean;
  citas: Cita[];
}

@Component({
  selector: 'app-calendario-citas',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonBadge, IonSpinner],
  templateUrl: './calendario-citas.html',
  styleUrls: ['./calendario-citas.css'],
})
export class CalendarioCitas implements OnInit, OnDestroy {
  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  semanas: DiaCal[][] = [];
  citas: Cita[] = [];
  diaSeleccionado: Date | null = null;
  citasDelDia: Cita[] = [];
  cargando = true;
  nutricionistaId = '';

  readonly DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  private channel?: RealtimeChannel;

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, calendarOutline });
  }

  async ngOnInit() {
    this.nutricionistaId = (await this.authService.getNutricionistaId()) ?? '';
    await this.cargarMes();
    this.seleccionarFecha(this.hoy);
    this.suscribirRealtime();
  }

  async cargarMes() {
    this.cargando = true;
    try {
      this.citas = await this.citasService.getCitasMes(
        this.nutricionistaId,
        this.mesActual.getFullYear(),
        this.mesActual.getMonth(),
      );
      this.construirCalendario();
      // Refresca citas del día seleccionado si hay uno
      if (this.diaSeleccionado) this.seleccionarFecha(this.diaSeleccionado);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  construirCalendario() {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const dias: DiaCal[] = [];

    const primerDia = new Date(año, mes, 1);
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const f = new Date(año, mes, -i);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    for (let d = 1; d <= ultimoDia; d++) {
      const f = new Date(año, mes, d);
      dias.push({ fecha: f, esDelMes: true, citas: this.citasEnFecha(f) });
    }

    while (dias.length % 7 !== 0) {
      const f = new Date(año, mes + 1, dias.length - ultimoDia - offsetInicio + 1);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  private citasEnFecha(fecha: Date): Cita[] {
    return this.citas.filter((c) => {
      const fc = new Date(c.fecha_hora);
      return fc.toDateString() === fecha.toDateString();
    });
  }

  tieneEstado(dia: DiaCal, estado: string): boolean {
    return dia.citas.some((c) => c.estado === estado);
  }

  seleccionarFecha(fecha: Date) {
    this.diaSeleccionado = fecha;
    this.citasDelDia = this.citasEnFecha(fecha);
    this.cdr.detectChanges();
  }

  async mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    await this.cargarMes();
  }

  async mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    await this.cargarMes();
  }

  esHoy(f: Date) {
    return f.toDateString() === this.hoy.toDateString();
  }
  esSeleccionado(f: Date) {
    return this.diaSeleccionado?.toDateString() === f.toDateString();
  }

  colorEstado(estado: string) {
    return { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[estado] ?? 'medium';
  }

  irAPaciente(cita: Cita) {
    this.router.navigate(['/pacientes', cita.paciente_id]);
  }

  private suscribirRealtime() {
    this.channel = this.citasService.suscribirCambios(this.nutricionistaId, () => this.cargarMes());
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }
}
