import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonBadge, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  videocamOutline, locationOutline, 
  checkmarkCircleOutline, closeCircleOutline, timeOutline 
} from 'ionicons/icons';
import { Cita } from '../../../core/services/citas';

@Component({
  selector: 'app-cita-card',
  standalone: true,
  imports: [CommonModule, IonIcon, IonBadge, IonButton],
  templateUrl: './cita-card.html',
  styleUrls: ['./cita-card.css'],   
})
export class CitaCard {
  @Input() cita!: Cita;
  @Input() mostrarPaciente = false;   // en dashboard se muestra, en ficha no
  @Input() mostrarAcciones = false;   // confirmar/cancelar rápido

  @Output() confirmar = new EventEmitter<Cita>();
  @Output() cancelar  = new EventEmitter<Cita>();
  @Output() editar    = new EventEmitter<Cita>();
  @Output() eliminar = new EventEmitter<Cita>();
  @Output() facturar = new EventEmitter<Cita>();

  constructor() {
    addIcons({ videocamOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline, timeOutline });
  }

  get colorEstado(): string {
    return { pendiente: 'warning', confirmada: 'success', cancelada: 'danger' }[this.cita.estado] ?? 'medium';
  }

  get icono(): string {
    return this.cita.tipo === 'videollamada' ? 'videocam-outline' : 'location-outline';
  }
}