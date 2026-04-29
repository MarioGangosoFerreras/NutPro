import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonSpinner,
  ModalController,
  IonSearchbar,
  IonList,
  IonAvatar,
  IonIcon,
  IonChip, // <-- AÑADIDO AQUI
} from '@ionic/angular/standalone';
import { CitasService, Cita } from '../../../core/services/citas';
import { PacientesService } from '../../../core/services/pacientes';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonSpinner,
    IonSearchbar,
    IonList,
    IonAvatar,
    IonIcon,
    IonChip, // <-- AÑADIDO AQUI
  ],
  templateUrl: './modal-cita.html',
  styleUrls: ['./modal-cita.css'],
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId?: string;
  @Input() nutricionistaId!: string;
  @Input() esPaciente = false;

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

  // 👇 AÑADIDO: Lógica de disponibilidad 👇
  horasDeTrabajo = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
  ];
  horasDisponibles: string[] = [];

  // Lógica del buscador
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  pacienteSeleccionadoId = '';
  pacienteSeleccionadoNombre = '';

  get esEdicion() {
    return !!this.cita?.id;
  }
  get titulo() {
    return this.esEdicion ? 'Editar cita' : 'Nueva cita';
  }

  constructor() {
    addIcons({ checkmarkCircle, closeCircleOutline, personCircleOutline });
  }

  async ngOnInit() {
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

      // 👇 AÑADIDO: Cargar horas disponibles para la fecha de la cita en edición
      await this.onFechaCambiada({ detail: { value: this.fecha } }, true);
    }
  }

  // 👇 AÑADIDO: Método para filtrar horas 👇
  async onFechaCambiada(event: any, esCargaInicial = false) {
    const value = event.detail?.value || event;
    if (!value) return;

    this.fecha = value.split('T')[0];
    if (!esCargaInicial) {
      this.hora = ''; // Reseteamos la hora si el usuario cambia de día manualmente
    }

    try {
      const citasOcupadas = await this.citasService.getHorariosOcupadosNutricionista(
        this.nutricionistaId,
      );

      const citasDelDia = citasOcupadas.filter((cita: any) =>
        cita.fecha_hora.startsWith(this.fecha),
      );

      this.horasDisponibles = this.horasDeTrabajo.filter((h) => {
        const horaEstaOcupada = citasDelDia.some((cita: any) => {
          const d = new Date(cita.fecha_hora);
          const horaCita = d.toTimeString().slice(0, 5); // ej: "09:30"

          // Si estamos editando y es esta misma cita, la dejamos disponible
          if (this.esEdicion && this.cita?.fecha_hora === cita.fecha_hora) return false;

          return horaCita === h;
        });
        return !horaEstaOcupada;
      });
    } catch (e) {
      console.error('Error al obtener horarios', e);
    }
  }

  async cargarPacientes() {
    const data = await this.pacientesService.getPacientes(this.nutricionistaId);
    this.pacientes.set(data || []);
    this.pacientesFiltrados.set(data || []);
  }

  filtrarPacientes(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    const filtrados = this.pacientes().filter((p) =>
      `${p.usuario?.nombre} ${p.usuario?.apellidos}`.toLowerCase().includes(query),
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
        // Lógica de seguridad: si es paciente, forzamos 'pendiente'
        estado: this.esPaciente ? 'pendiente' : this.estado,
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
