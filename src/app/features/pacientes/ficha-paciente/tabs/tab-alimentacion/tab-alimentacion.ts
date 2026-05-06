import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import { IonButton, IonIcon, IonSpinner, IonItem, IonLabel, IonInput, IonTextarea, IonToggle, ToastController, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

/**
 * Componente que gestiona la pestaña de "Alimentación" dentro de la ficha de un paciente.
 * Permite visualizar y editar la encuesta alimentaria y hábitos del paciente.
 *
 * @export
 * @class TabAlimentacion
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-alimentacion',
  imports: [
    FormsModule,
    IonButton, IonIcon, IonSpinner, IonItem, IonLabel,
    IonInput, IonTextarea, IonToggle,
    IonSelectOption
],
  templateUrl: './tab-alimentacion.html',
  styleUrl: './tab-alimentacion.css',
})
export class TabAlimentacion implements OnInit {
  /** Identificador único del paciente asociado a esta pestaña. */
  @Input() pacienteId!: string;

  encuesta: any = null;
  loading = false;
  guardando = false;
  cambios = false;
  formEncuesta: any = {};

  /**
   * Crea una instancia de TabAlimentacion y registra los iconos usados.
   *
   * @param {FichaClinicaService} fichaClinicaService - Servicio para consultar y actualizar datos clínicos.
   * @param {ChangeDetectorRef} cdr - Referencia al detector de cambios para forzar actualizaciones de la UI.
   * @param {ToastController} toastCtrl - Controlador para mostrar mensajes tipo toast en pantalla.
   */
  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({ saveOutline });
  }

  /**
   * Inicializa el componente solicitando a la base de datos la encuesta
   * alimentaria del paciente y configurando el formulario con dichos datos o valores por defecto.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    this.loading = true;
    try {
      const enc = await this.fichaClinicaService.getEncuestaAlimentaria(this.pacienteId);
      this.encuesta = enc;
      this.formEncuesta = enc
        ? { ...enc }
        : {
            come_en_casa: null, hace_la_comida: null, le_gusta_cocinar: null,
            come_solo_tv: '', num_comidas_dia: null, come_tranquilo: null,
            ansiedad_comida: '', apetito: '', picotea: null,
            consumo_agua_litros: null, otras_bebidas: '', preferencias_alimentarias: '',
            aversiones_alimentarias: '',
          };
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Establece el indicador de cambios a verdadero para habilitar el botón de guardado.
   */
  marcarCambios() { this.cambios = true; }

  /**
   * Almacena los cambios realizados en el formulario en la base de datos
   * y resetea el estado de cambios.
   *
   * @returns {Promise<void>}
   */
  async guardar() {
    this.guardando = true;
    try {
      await this.fichaClinicaService.upsertEncuestaAlimentaria(this.pacienteId, this.formEncuesta);
      this.cambios = false;
      await this.mostrarToast('Encuesta guardada', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar', 'danger');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Muestra un mensaje emergente tipo toast en la interfaz.
   *
   * @private
   * @param {string} mensaje - El texto del mensaje.
   * @param {string} color - Color asociado al tipo de mensaje ('success', 'danger', etc.).
   * @returns {Promise<void>}
   */
  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}