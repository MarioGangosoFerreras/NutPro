import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonButton,
  IonSkeletonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  calendarOutline,
  chevronForwardOutline,
  locationOutline,
  peopleOutline,
  videocamOutline,
} from 'ionicons/icons';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';

/**
 * Componente que muestra una lista resumida o vista previa (preview)
 * de los próximos pacientes o pacientes activos dentro del panel de control (Dashboard).
 * Funciona en tiempo real observando los cambios en la base de datos.
 *
 * @export
 * @class ListaPacientesPreviewComponent
 * @implements {OnInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-lista-pacientes-preview',
  imports: [CommonModule, IonSkeletonText, IonIcon],
  templateUrl: './lista-pacientes-preview.html',
  styleUrl: './lista-pacientes-preview.css',
})
export class ListaPacientesPreviewComponent implements OnInit, OnDestroy {
  /** Array de pacientes que se van a mostrar en la lista resumida */
  pacientes: any[] = [];
  /** Indica si la vista está actualmente cargando los datos */
  cargando = true;
  /** Límite máximo de pacientes a mostrar en la vista previa */
  readonly LIMITE = 5;
  /** Referencia de suscripción al canal en tiempo real de Supabase */
  private citaSub: any; // Para guardar la suscripción

  /**
   * Crea una instancia de ListaPacientesPreviewComponent y configura los iconos a mostrar.
   *
   * @param {PacientesService} pacientesService - Servicio para consultar y manipular información de pacientes.
   * @param {AuthService} authService - Servicio de autenticación.
   * @param {Router} router - Servicio de enrutamiento para transiciones entre vistas.
   * @param {ChangeDetectorRef} cdr - Herramienta para marcar la vista para detección de cambios.
   * @param {NgZone} ngZone - Permite salir y entrar en la zona de ejecución de Angular para que el realtime sea reactivo.
   */
  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {
    addIcons({
      arrowForwardOutline,
      peopleOutline,
      chevronForwardOutline,
      calendarOutline,
      locationOutline,
      videocamOutline,
    });
  }

  /**
   * Se invoca en la inicialización del componente.
   * Carga los datos iniciales e inicia la escucha de eventos en tiempo real.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarPacientes();
    this.escucharCambios();
  }

  // CONFIGURACIÓN REALTIME
  /**
   * Configura una suscripción a la base de datos de Supabase que escucha
   * cambios en la tabla 'citas'. Al detectarlos, recarga la lista de pacientes
   * actualizando la UI de forma automática.
   *
   * @private
   */
  private escucharCambios() {
    this.citaSub = this.pacientesService.supabaseClient
      .channel(`citas-preview-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
        // Ejecutamos la recarga dentro de ngZone para asegurar que Angular
        // detecte los cambios en la vista al venir de un evento externo
        this.ngZone.run(() => this.cargarPacientes());
      })
      .subscribe((status, err) => {
      if (err) console.error('Error en la suscripción de citas:', err);
    });
  }

  /**
   * Carga desde base de datos la previsualización de pacientes utilizando el ID
   * del nutricionista activo.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async cargarPacientes() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) return;

      const nuevosDatos = await this.pacientesService.getPacientesPreview(
        nutricionistaId,
        this.LIMITE,
      );

      this.pacientes = [...nuevosDatos];
    } catch (error) {
      console.error('Error al recargar:', error);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Se invoca al destruir el componente.
   * Libera recursos y desuscribe el socket de tiempo real para evitar fugas de memoria.
   */
  ngOnDestroy() {
    // Limpieza vital para evitar fugas de memoria
    this.pacientesService.desuscribirCitas(this.citaSub);
  }

  /**
   * Navega hacia la ficha completa del paciente seleccionado.
   *
   * @param {string} pacienteId - El identificador del paciente en base de datos.
   */
  irAFicha(pacienteId: string) {
    this.router.navigate(['/pacientes', pacienteId]);
  }

  /**
   * Navega a la vista de la lista global de pacientes.
   */
  verTodos() {
    this.router.navigate(['/pacientes']);
  }

  /**
   * Comprueba si un string de fecha (ISO) corresponde al día de hoy local.
   *
   * @param {string} fecha - La cadena de texto de la fecha.
   * @returns {boolean} Retorna true si es hoy, o false en caso contrario.
   */
  esHoy(fecha: string): boolean {
    const hoy = new Date().toDateString();
    const fechaCita = new Date(fecha).toDateString();
    return hoy === fechaCita;
  }
}
