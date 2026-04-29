import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, ModalController } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { UniversalCalendar } from '../../../../shared/components/universal-calendar/universal-calendar';
import { Cita, CitasService } from '../../../../core/services/citas';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, IonContent, Header, UniversalCalendar],
  templateUrl: './mis-citas.html',
  styleUrls: ['./mis-citas.css']
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
    
    // Comprobamos que el usuario existe antes de leer su ID
    if (usuario && usuario.id) {
      this.pacienteData = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
      
      // Solo cargamos las citas si hemos podido obtener el perfil del paciente
      if (this.pacienteData) {
        await this.cargarCitas();
      }
    }
  }

  async cargarCitas() {
    const data = await this.citasService.getCitasPaciente(
      this.pacienteData.id, 
      this.pacienteData.nutricionista_id
    );
    this.citas.set(data);
  }
}