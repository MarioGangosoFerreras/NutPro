import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { TabMediciones } from '../../../pacientes/ficha-paciente/tabs/tab-mediciones/tab-mediciones';

/**
 * Vista dedicada para que el paciente consulte el historial de su progreso
 * y métricas antropométricas, reutilizando el componente "TabMediciones" en modo lectura y pantalla completa.
 *
 * @export
 * @class MiEvolucion
 * @implements {OnInit}
 */
@Component({
  selector: 'app-mi-evolucion',
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner, IonIcon, Header, TabMediciones],
  templateUrl: './mi-evolucion.html',
  styleUrls: ['./mi-evolucion.css']
})
export class MiEvolucion implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);

  /** Señal reactiva que almacena los datos del paciente logueado. */
  paciente = signal<any>(null);
  /** Señal reactiva que indica si la vista está cargando la información inicial. */
  cargando = signal(true);

  /**
   * Se ejecuta al iniciar el componente.
   * Recupera el ID del usuario en sesión, comprueba que tenga el rol de 'paciente',
   * y carga su perfil para poder pasárselo al componente hijo de mediciones.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario && usuario.rol === 'paciente') {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
      }
    } finally {
      this.cargando.set(false);
    }
  }
}