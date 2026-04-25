import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonTextarea, IonSpinner,
  ModalController, IonSearchbar, IonList, IonAvatar, IonIcon
} from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';
import { PacientesService } from '../../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonLabel, IonInput, IonSelect,
    IonSelectOption, IonTextarea, IonSpinner,
    IonSearchbar, IonList, IonAvatar, IonIcon
  ],
  templateUrl: './modal-cita.html',
  styleUrls: ['./modal-cita.css'] // <-- Añadimos el archivo de estilos
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId?: string;
  @Input() nutricionistaId!: string;

  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);
  private pacientesService = inject(PacientesService);

  guardando = false;

  // Campos del formulario
  fecha = '';
  hora = '';
  duracion = 45;
  tipo: 'presencial' | 'videollamada' = 'presencial';
  estado: 'pendiente' | 'confirmada' | 'cancelada' = 'pendiente';
  notas = '';
  urlVideo = '';

  // Lógica del buscador
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  pacienteSeleccionadoId = '';
  pacienteSeleccionadoNombre = '';

  get esEdicion() { return !!this.cita?.id; }
  get titulo() { return this.esEdicion ? 'Editar cita' : 'Nueva cita'; }

  constructor() {
    addIcons({ checkmarkCircle, closeCircleOutline, personCircleOutline });
  }

  ngOnInit() {
    this.pacienteSeleccionadoId = this.pacienteId || '';

    // Si abrimos desde el calendario grande, cargamos los pacientes
    if (!this.pacienteSeleccionadoId) {
      this.cargarPacientes();
    }

    if (this.cita) {
      const d = new Date(this.cita.fecha_hora);
      this.fecha = d.toISOString().slice(0, 10);
      this.hora = d.toTimeString().slice(0, 5);
      this.duracion = this.cita.duracion_min;
      this.tipo = this.cita.tipo;
      this.estado = this.cita.estado;
      this.notas = this.cita.notas ?? '';
      this.urlVideo = this.cita.url_videollamada ?? '';
      this.pacienteSeleccionadoId = this.cita.paciente_id;
    }
  }

  async cargarPacientes() {
    const data = await this.pacientesService.getPacientes(this.nutricionistaId);
    this.pacientes.set(data || []);
    this.pacientesFiltrados.set(data || []);
  }

  filtrarPacientes(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    const filtrados = this.pacientes().filter(p =>
      `${p.usuario?.nombre} ${p.usuario?.apellidos}`.toLowerCase().includes(query)
    );
    this.pacientesFiltrados.set(filtrados);
  }

  seleccionarPaciente(p: any) {
    this.pacienteSeleccionadoId = p.id;
    this.pacienteSeleccionadoNombre = `${p.usuario?.nombre} ${p.usuario?.apellidos}`;
  }

  quitarPaciente() {
    this.pacienteSeleccionadoId = '';
    this.pacienteSeleccionadoNombre = '';
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancelado');
  }

  async guardar() {
    if (!this.fecha || !this.hora || !this.pacienteSeleccionadoId) return;

    this.guardando = true;
    try {
      const fecha_hora = new Date(`${this.fecha}T${this.hora}`).toISOString();

      const payload: Omit<Cita, 'id'> = {
        paciente_id: this.pacienteSeleccionadoId,
        nutricionista_id: this.nutricionistaId,
        fecha_hora,
        duracion_min: this.duracion,
        tipo: this.tipo,
        estado: this.estado,
        notas: this.notas || undefined,
        url_videollamada: this.tipo === 'videollamada' ? this.urlVideo || undefined : undefined,
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