import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, addCircleOutline } from 'ionicons/icons';
import { Cita } from '../../../../../../core/services/citas';
import { CitaCard } from '../../../../../../shared/components/cita-card/cita-card';

interface DiaCal { fecha: Date; esDelMes: boolean; citas: Cita[]; }

@Component({
  selector: 'app-citas-calendario',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, CitaCard],
  templateUrl: './citas-calendario.html',
  styleUrls: ['./citas-calendario.css'],
})
export class CitasCalendario implements OnChanges {
  @Input() citas: Cita[] = [];
  @Input() nutricionistaId!: string;
  @Output() editarCita = new EventEmitter<Cita>();
  @Output() nuevaCita  = new EventEmitter<void>();

  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  diaSeleccionado: Date | null = null;
  citasDelDia: Cita[] = [];
  semanas: DiaCal[][] = [];

  readonly DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, addCircleOutline });
  }
  ngOnChanges(changes: SimpleChanges): void {
    throw new Error('Method not implemented.');
  }

  nngOnChanges(changes: SimpleChanges) {
  if (changes['citas']) {
    this.construirCalendario();
    if (this.diaSeleccionado) {                                    
      this.citasDelDia = this.citasEnFecha(this.diaSeleccionado); 
    }                                                              
  }
}

  construirCalendario() {
    const año  = this.mesActual.getFullYear();
    const mes  = this.mesActual.getMonth();
    const dias: DiaCal[] = [];

    // Relleno inicio (lunes = 0)
    const primerDia = new Date(año, mes, 1);
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const f = new Date(año, mes, -i);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    // Días del mes
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    for (let d = 1; d <= ultimoDia; d++) {
      const f = new Date(año, mes, d);
      dias.push({ fecha: f, esDelMes: true, citas: this.citasEnFecha(f) });
    }

    // Relleno final
    while (dias.length % 7 !== 0) {
      const f = new Date(año, mes + 1, dias.length - ultimoDia - offsetInicio + 1);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    // Agrupar en semanas
    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  private citasEnFecha(fecha: Date): Cita[] {
    return this.citas.filter(c => {
      const fc = new Date(c.fecha_hora);
      return fc.getFullYear() === fecha.getFullYear() &&
             fc.getMonth()    === fecha.getMonth() &&
             fc.getDate()     === fecha.getDate();
    });
  }

  seleccionarDia(dia: DiaCal) {
    this.diaSeleccionado = dia.fecha;
    this.citasDelDia = dia.citas;
  }

  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.construirCalendario();
  }

  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.construirCalendario();
  }

  esHoy(fecha: Date): boolean {
    return fecha.toDateString() === this.hoy.toDateString();
  }

  esSeleccionado(fecha: Date): boolean {
    return this.diaSeleccionado?.toDateString() === fecha.toDateString();
  }
}