import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { Cita } from '../../../../../../core/services/citas';
import { CitaCard } from '../../../../../../shared/components/cita-card/cita-card';

/**
 * Interfaz que define una agrupación de citas correspondientes a un mismo día.
 *
 * @interface GrupoCitas
 */
interface GrupoCitas { 
  fecha: Date; 
  citas: Cita[]; 
}

/**
 * Componente encargado de renderizar una lista agrupada (por fecha) de tarjetas de citas.
 *
 * @export
 * @class CitasLista
 */
@Component({
  selector: 'app-citas-lista',
  standalone: true,
  imports: [CommonModule, IonIcon, CitaCard],
  templateUrl: './citas-lista.html',
  styleUrls: ['./citas-lista.css'],
})
export class CitasLista {
  /**
   * Recibe el array crudo de citas y las procesa (agrupa por día) para su renderizado.
   *
   * @memberof CitasLista
   */
  @Input() set citas(value: Cita[]) {
    this._citas = value;
    this.grupos = this.agrupar(value);
  }
  
  /** Evento emitido al hacer clic en "Editar" una cita. */
  @Output() editarCita    = new EventEmitter<Cita>();
  /** Evento emitido al hacer clic en "Confirmar" una cita pendiente. */
  @Output() confirmarCita = new EventEmitter<Cita>();
  /** Evento emitido al hacer clic en "Cancelar" una cita. */
  @Output() cancelarCita  = new EventEmitter<Cita>();
  /** Evento emitido al hacer clic en "Eliminar" una cita. */
  @Output() eliminarCita  = new EventEmitter<Cita>();
  /** Evento emitido al hacer clic en "Facturar" una cita finalizada. */
  @Output() facturarCita = new EventEmitter<Cita>();

  /** Almacenamiento interno del array original de citas. */
  _citas: Cita[] = [];
  /** Array de citas transformadas y agrupadas por fecha para su iteración en la vista. */
  grupos: GrupoCitas[] = [];

  /**
   * Crea una instancia del componente CitasLista y registra los iconos usados.
   */
  constructor() { addIcons({ calendarOutline }); }

  /**
   * Transforma una lista plana de citas en una lista estructurada y agrupada
   * por fecha, ordenando además los grupos cronológicamente.
   *
   * @private
   * @param {Cita[]} citas - La lista plana de citas.
   * @returns {GrupoCitas[]} Una lista de objetos que agrupa las citas por su día correspondiente.
   */
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