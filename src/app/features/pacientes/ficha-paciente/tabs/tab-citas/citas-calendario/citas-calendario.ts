import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, addCircleOutline } from 'ionicons/icons';
import { Cita } from '../../../../../../core/services/citas';
import { CitaCard } from '../../../../../../shared/components/cita-card/cita-card';

interface DiaCal {
  fecha: Date;
  esDelMes: boolean;
  citas: Cita[];
}

@Component({
  selector: 'app-citas-calendario',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, CitaCard],
  templateUrl: './citas-calendario.html',
  styleUrls: ['./citas-calendario.css'],
})
export class CitasCalendario implements OnChanges, OnInit {
  @Input() citas: Cita[] = [];
  @Input() nutricionistaId!: string;
  @Output() editarCita = new EventEmitter<Cita>();
  @Output() nuevaCita = new EventEmitter<void>();

  hoy = new Date();
  mesActual = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), 1);
  diaSeleccionado: Date | null = null;
  citasDelDia: Cita[] = [];
  semanas: DiaCal[][] = [];

  readonly DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, addCircleOutline });
  }

  ngOnInit(): void {
    this.construirCalendario();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['citas']) {
      this.construirCalendario();

      // Si ya había un día seleccionado, refrescamos sus citas
      if (this.diaSeleccionado) {
        this.citasDelDia = this.citasEnFecha(this.diaSeleccionado);
      }
    }
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
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const dias: DiaCal[] = [];

    // 1. Calcular el primer día y el desfase (Lunes = 0)
    const primerDiaMes = new Date(año, mes, 1);
    // Ajuste para que Lunes sea 0 y Domingo 6
    let offsetInicio = primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1;

    // 2. Rellenar días del mes anterior
    for (let i = offsetInicio; i > 0; i--) {
      const f = new Date(año, mes, 1 - i);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    // 3. Días del mes actual
    const ultimoDiaMes = new Date(año, mes + 1, 0).getDate();
    for (let d = 1; d <= ultimoDiaMes; d++) {
      const f = new Date(año, mes, d);
      dias.push({ fecha: f, esDelMes: true, citas: this.citasEnFecha(f) });
    }

    // 4. Rellenar días del mes siguiente hasta completar la semana
    let cont = 1;
    while (dias.length % 7 !== 0) {
      const f = new Date(año, mes + 1, cont++);
      dias.push({ fecha: f, esDelMes: false, citas: this.citasEnFecha(f) });
    }

    // 5. Agrupar en semanas
    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  private citasEnFecha(fecha: Date): Cita[] {
    if (!this.citas) return [];
    return this.citas.filter((c) => {
      const fc = new Date(c.fecha_hora);
      return (
        fc.getFullYear() === fecha.getFullYear() &&
        fc.getMonth() === fecha.getMonth() &&
        fc.getDate() === fecha.getDate()
      );
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
