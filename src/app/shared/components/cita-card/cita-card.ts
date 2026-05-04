import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonBadge, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  videocamOutline,
  locationOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  createOutline,
  documentTextOutline,
  trashOutline,
  linkOutline,
  informationCircleOutline, 
} from 'ionicons/icons';
import { Cita } from '../../../core/services/citas';

/**
 * Componente visual reutilizable que muestra la información de una cita en forma de tarjeta.
 * Dependiendo de los parámetros de entrada, puede mostrar diferentes botones de acción
 * (confirmar, editar, facturar, cancelar, eliminar) y adaptarse para la vista de paciente o nutricionista.
 *
 * @export
 * @class CitaCard
 */
@Component({
  selector: 'app-cita-card',
  standalone: true,
  imports: [CommonModule, IonIcon, IonBadge, IonButton],
  templateUrl: './cita-card.html',
  styleUrls: ['./cita-card.css'],
})
export class CitaCard {
  /** Objeto que contiene todos los datos de la cita a renderizar. */
  @Input() cita!: Cita;
  /** Si es verdadero, muestra información específica del paciente en la tarjeta. */
  @Input() mostrarPaciente = false;
  /** Controla si se debe renderizar el bloque de botones de acción. */
  @Input() mostrarAcciones = false;
  /** Habilita el botón de facturar si la cita ya ocurrió y está confirmada. */
  @Input() permitirFacturar = true;
  /** Determina si la tarjeta está siendo vista por el paciente (para ocultar acciones de gestión). */
  @Input() esPaciente = false;

  /** Evento emitido al presionar el botón "Confirmar". */
  @Output() confirmar = new EventEmitter<Cita>();
  /** Evento emitido al presionar el botón "Cancelar". */
  @Output() cancelar = new EventEmitter<Cita>();
  /** Evento emitido al presionar el botón "Editar". */
  @Output() editar = new EventEmitter<Cita>();
  /** Evento emitido al presionar el botón de eliminación (basurero). */
  @Output() eliminar = new EventEmitter<Cita>();
  /** Evento emitido al presionar el botón "Factura". */
  @Output() facturar = new EventEmitter<Cita>();

  /**
   * Crea una instancia de CitaCard e inicializa los iconos de Ionic utilizados en la tarjeta.
   */
  constructor() {
    addIcons({
      videocamOutline,
      locationOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      createOutline,
      documentTextOutline,
      trashOutline,
      linkOutline, // <-- AÑADIDO
      informationCircleOutline, // <-- AÑADIDO
    });
  }

  /**
   * Obtiene el color semántico de Ionic ('warning', 'success', 'danger', 'medium') 
   * correspondiente al estado actual de la cita.
   *
   * @readonly
   * @type {string}
   */
  get colorEstado(): string {
    return (
      { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[this.cita.estado] ??
      'medium'
    );
  }

  /**
   * Devuelve el nombre del icono correspondiente según si la cita es por videollamada o presencial.
   *
   * @readonly
   * @type {string}
   */
  get icono(): string {
    return this.cita.tipo === 'videollamada' ? 'videocam-outline' : 'location-outline';
  }

  /**
   * Evalúa si la fecha y hora de la cita ya han pasado respecto al momento actual.
   * Útil para saber si la cita ya puede ser facturada.
   *
   * @returns {boolean} Verdadero si la cita ya ocurrió.
   */
  citaPasada(): boolean {
    return new Date(this.cita.fecha_hora).getTime() < new Date().getTime();
  }
}