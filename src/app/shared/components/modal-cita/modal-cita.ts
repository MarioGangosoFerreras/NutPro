import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonTextarea, IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonLabel, IonInput, IonSelect,
    IonSelectOption, IonTextarea, IonSpinner,
  ],
  templateUrl: './modal-cita.html',
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId!: string;
  @Input() nutricionistaId!: string;

  private modalCtrl   = inject(ModalController);
  private citasService = inject(CitasService);

  guardando = false;

  // Campos del formulario
  fecha      = '';   // 'yyyy-MM-dd'
  hora       = '';   // 'HH:mm'
  duracion   = 45;
  tipo: 'presencial' | 'videollamada' = 'presencial';
  estado: 'pendiente' | 'confirmada' | 'cancelada' = 'pendiente';
  notas      = '';
  urlVideo   = '';

  get esEdicion() { return !!this.cita?.id; }
  get titulo()    { return this.esEdicion ? 'Editar cita' : 'Nueva cita'; }

  ngOnInit() {
    if (this.cita) {
      const d = new Date(this.cita.fecha_hora);
      this.fecha    = d.toISOString().slice(0, 10);
      this.hora     = d.toTimeString().slice(0, 5);
      this.duracion = this.cita.duracion_min;
      this.tipo     = this.cita.tipo;
      this.estado   = this.cita.estado;
      this.notas    = this.cita.notas ?? '';
      this.urlVideo = this.cita.url_videollamada ?? '';
    }
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancelado');
  }

  async guardar() {
    if (!this.fecha || !this.hora) return;

    this.guardando = true;
    try {
      const fecha_hora = new Date(`${this.fecha}T${this.hora}`).toISOString();

      const payload: Omit<Cita, 'id'> = {
        paciente_id:       this.pacienteId,
        nutricionista_id:  this.nutricionistaId,
        fecha_hora,
        duracion_min:      this.duracion,
        tipo:              this.tipo,
        estado:            this.estado,
        notas:             this.notas || undefined,
        url_videollamada:  this.tipo === 'videollamada' ? this.urlVideo || undefined : undefined,
      };

      if (this.esEdicion) {
        await this.citasService.editarCita(this.cita!.id!, payload);
      } else {
        await this.citasService.crearCita(payload);
      }

      await this.modalCtrl.dismiss(null, 'guardado');
    } finally {
      this.guardando = false;
    }
  }
}