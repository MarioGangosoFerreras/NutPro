import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { TabDocumentos } from '../../../pacientes/ficha-paciente/tabs/tab-documentos/tab-documentos';

/**
 * Vista en la que el paciente puede gestionar los documentos que le competen:
 * subir informes, analíticas, o consultar y descargar las facturas emitidas por su nutricionista.
 *
 * @export
 * @class MisDocumentos
 * @implements {OnInit}
 */
@Component({
  selector: 'app-mis-documentos',
  standalone: true,
  imports: [CommonModule, IonContent, Header, TabDocumentos],
  templateUrl: './mis-documentos.html',
})
export class MisDocumentos implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);

  /** Señal reactiva que alberga el perfil completo del paciente. */
  paciente = signal<any>(null);
  /** Señal reactiva que marca si el perfil principal se está cargando. */
  cargando = signal(true);

  /**
   * Método inicializado por Angular.
   * Obtiene la sesión actual, recupera el perfil del paciente y apaga el indicador de carga.
   * El componente embebido `<app-tab-documentos>` se encarga a partir de ahí de cargar los ficheros.
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