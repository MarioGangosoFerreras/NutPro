import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { CitasService } from '../../../core/services/citas';

@Component({
  selector: 'app-modal-pedir-cita',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSpinner,
  ],
  templateUrl: './modal-pedir-cita.html',
  styleUrls: ['./modal-pedir-cita.css'],
})
export class ModalPedirCitaComponent implements OnInit {
  @Input() nutricionistaId!: string;
  @Input() pacienteId!: string;

  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);

  fecha = new Date().toISOString().split('T')[0];
  horaSeleccionada = '';
  guardando = false;
  horasOcupadas: string[] = [];

  // Slots de tiempo configurables
  slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00'];

  constructor() {
    addIcons({ closeOutline, checkmarkCircleOutline });
  }

  async ngOnInit() {
    await this.cargarDisponibilidad();
  }

  async cargarDisponibilidad() {
    this.horasOcupadas = await this.citasService.getHorasOcupadas(this.nutricionistaId, this.fecha);
  }

  async solicitar() {
    this.guardando = true;
    try {
      const fecha_hora = new Date(`${this.fecha}T${this.horaSeleccionada}`).toISOString();
      await this.citasService.crearCita({
        paciente_id: this.pacienteId,
        nutricionista_id: this.nutricionistaId,
        fecha_hora,
        duracion_min: 60,
        tipo: 'presencial', // Por defecto
        estado: 'pendiente', // Siempre pendiente hasta que el nutri acepte
        notas: 'Solicitud enviada por el paciente',
      });
      this.modalCtrl.dismiss(null, 'creado');
    } finally {
      this.guardando = false;
    }
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}
