import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';

/**
 * Componente visual que permite al paciente registrar y hacer seguimiento 
 * de sus hábitos diarios (agua, fruta, sueño) mediante una interfaz interactiva de emojis.
 *
 * @export
 * @class HabitosTrackerComponent
 */
@Component({
  selector: 'app-habitos-tracker',
  standalone: true,
  imports: [CommonModule, IonCard, ],
  templateUrl: './habitos-tracker.html',
  styleUrls: ['../../portal-paciente.css']
})
export class HabitosTrackerComponent {
  /**
   * Objeto que contiene los valores actuales de los hábitos del paciente.
   * Espera una estructura similar a: { agua: number, fruta: number, sueno: number }
   *
   * @type {*}
   */
  @Input() habitos: any;

  /**
   * Evento que se emite cuando el paciente interactúa (hace clic) sobre uno de los iconos de hábito.
   * Envía al componente padre el tipo de hábito modificado y su nuevo valor.
   *
   * @type {EventEmitter<{tipo: string, valor: number}>}
   */
  @Output() onToggle = new EventEmitter<{tipo: string, valor: number}>();
}