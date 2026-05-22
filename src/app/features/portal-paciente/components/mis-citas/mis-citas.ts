import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, ModalController } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { UniversalCalendar } from '../../../../shared/components/universal-calendar/universal-calendar';
import { Cita, CitasService } from '../../../../core/services/citas';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { ModalCitaComponent } from '../../../../shared/components/modal-cita/modal-cita';

/**
 * Componente que provee al paciente de una vista completa de calendario 
 * para consultar sus citas programadas y solicitar nuevas.
 *
 * @export
 * @class MisCitas
 * @implements {OnInit}
 */
@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, IonContent, Header, UniversalCalendar],
  templateUrl: './mis-citas.html',
  styleUrls: ['./mis-citas.css'],
})
export class MisCitas implements OnInit {
  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private modalCtrl = inject(ModalController);

  /** Señal reactiva que contiene el listado de citas asociadas al paciente. */
  citas = signal<Cita[]>([]);
  /** Estructura con la información general del paciente (ID, nutricionista asignado, etc.). */
  pacienteData: any;

  /**
   * Se ejecuta al inicializar el componente.
   * Obtiene la sesión actual, descarga la ficha del paciente, y llama a la carga de sus citas.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    if (usuario && usuario.id) {
      this.pacienteData = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
      if (this.pacienteData) {
        await this.cargarCitas();
      }
    }
  }

  /**
   * Consulta las citas vinculadas al ID del paciente a través del servicio correspondiente
   * y las asigna a la señal reactiva `citas` para que el calendario las dibuje.
   *
   * @returns {Promise<void>}
   */
  async cargarCitas() {
    // Obtenemos todas las citas del paciente para que aparezcan en el calendario
    const data = await this.citasService.getCitasPaciente(this.pacienteData.id);
    this.citas.set(data);
  }

  /**
   * Abre un cuadro modal que permite al paciente reservar o pedir una nueva cita 
   * pasándole por defecto la fecha seleccionada en el calendario.
   *
   * @param {string} [fechaDesdeCalendario] - Opcionalmente, la fecha que el paciente ha pulsado en el calendario.
   * @returns {Promise<void>}
   */
  async pedirCita(fechaDesdeCalendario?: string) {
    const modal = await this.modalCtrl.create({
      component: ModalCitaComponent,
      componentProps: {
        pacienteId: this.pacienteData.id,
        nutricionistaId: this.pacienteData.nutricionista_id,
        fechaSeleccionada: fechaDesdeCalendario, // Pasamos la fecha
        esPaciente: true 
      },
      breakpoints: [0, 0.85],
      initialBreakpoint: 0.85
    });
    
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'guardado') {
      await this.cargarCitas();
    }
  }
}