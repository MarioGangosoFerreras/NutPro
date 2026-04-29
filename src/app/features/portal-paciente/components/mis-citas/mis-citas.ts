import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, ModalController } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { UniversalCalendar } from '../../../../shared/components/universal-calendar/universal-calendar';
import { Cita, CitasService } from '../../../../core/services/citas';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { ModalCitaComponent } from '../../../../shared/components/modal-cita/modal-cita';

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

  citas = signal<Cita[]>([]);
  pacienteData: any;

  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    if (usuario && usuario.id) {
      this.pacienteData = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
      if (this.pacienteData) {
        await this.cargarCitas();
      }
    }
  }

  async cargarCitas() {
    // Obtenemos todas las citas del paciente para que aparezcan en el calendario
    const data = await this.citasService.getCitasPaciente(this.pacienteData.id);
    this.citas.set(data);
  }

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
