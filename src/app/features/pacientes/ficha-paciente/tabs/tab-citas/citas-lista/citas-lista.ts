import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { Cita } from '../../../../../../core/services/citas';
import { CitaCard } from '../../../../../../shared/components/cita-card/cita-card';

interface GrupoCitas { fecha: Date; citas: Cita[]; }

@Component({
  selector: 'app-citas-lista',
  standalone: true,
  imports: [CommonModule, IonIcon, CitaCard],
  templateUrl: './citas-lista.html',
  styleUrls: ['./citas-lista.css'],
})
export class CitasLista {
  @Input() set citas(value: Cita[]) {
    this._citas = value;
    this.grupos = this.agrupar(value);
  }
  @Output() editarCita    = new EventEmitter<Cita>();
  @Output() confirmarCita = new EventEmitter<Cita>();
  @Output() cancelarCita  = new EventEmitter<Cita>();
  @Output() eliminarCita  = new EventEmitter<Cita>();
  @Output() facturarCita = new EventEmitter<Cita>();

  _citas: Cita[] = [];
  grupos: GrupoCitas[] = [];

  constructor() { addIcons({ calendarOutline }); }

  private agrupar(citas: Cita[]): GrupoCitas[] {
    const mapa = new Map<string, Cita[]>();
    citas.forEach(c => {
      const key = new Date(c.fecha_hora).toDateString();
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(c);
    });
    return Array.from(mapa.entries())
      .map(([k, v]) => ({ fecha: new Date(k), citas: v }))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }
}