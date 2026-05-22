import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../../core/services/ficha-clinica';
import {
  IonContent, IonButton, IonIcon, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';

/**
 * Componente (tipo modal) emergente para permitir la adición manual 
 * y/o la edición de métricas físicas relativas a la salud en un periodo concreto.
 *
 * @export
 * @class ModalMedicion
 * @implements {OnInit}
 */
@Component({
  selector: 'app-modal-medicion',
  imports: [
    FormsModule,
    IonContent, IonButton, IonIcon, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
  ],
  templateUrl: './modal-medicion.html',
})
export class ModalMedicion implements OnInit {
  /** Propiedad para el titular visible sobre la cabecera modal (Ej. 'Editar medición'). */
  @Input() titulo = 'Nueva medición';
  /** ID del paciente a quién adjuntar los registros antropométricos. */
  @Input() pacienteId!: string;
  /** Si se pasa un objeto poblado de datos, el modal activará la edición (UPDATE). Si se pasa null, será creación (INSERT). */
  @Input() medicion: any = null;

  /** Evento activado cuando el flujo al servicio termina sin excepciones. */
  @Output() guardado = new EventEmitter<void>();
  /** Evento activado al presionar botones cancelatorios o en cierre nativo. */
  @Output() cancelado = new EventEmitter<void>();

  /** Repositorio bidireccional local (`ngModel`) adjuntado a cada Input del HTML. */
  form: any = {};
  /** Impide clicks y muestra feedback visual durante el contacto a la BD. */
  guardando = false;

  /**
   * Crea una instancia de ModalMedicion.
   *
   * @param {FichaClinicaService} fichaClinicaService - Proveedor de guardado.
   * @param {ChangeDetectorRef} cdr - Angular CD.
   * @param {ToastController} toastCtrl - Avisos en pantalla.
   */
  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({ closeOutline, saveOutline });
  }

  /**
   * Rellena las cajas de texto de edición con los datos si `@Input() medicion` contenía algo, 
   * si no lo había, limpia el objeto preparándolo como un 'New entry' vacío a fecha de hoy.
   */
  ngOnInit() {
    if (this.medicion) {
      this.form = { ...this.medicion };
    } else {
      this.resetForm();
    }
  }

  /**
   * Establece un lienzo vacío por defecto en los valores a rellenar, fijando
   * por practicidad la fecha predeterminada a la del día en transcurso.
   *
   * @private
   */
  private resetForm() {
    this.form = {
      fecha: new Date().toISOString().split('T')[0],
      peso_kg: null,
      altura_cm: null,
      grasa_corporal_pct: null,
      masa_muscular_kg: null,
      perimetro_cintura_cm: null,
      perimetro_cadera_cm: null,
      perimetro_abdomen_cm: null,
      notas: '',
    };
  }

  /**
   * Encapsula un switch IF-ELSE asíncrono consultando a supabase a través 
   * del `FichaClinicaService` de si tiene que realizar un PUT de actualización 
   * u POST para insertar si la `@Input() medicion` carecía de ID. Emite éxito a su padre al terminar.
   *
   * @returns {Promise<void>}
   */
  async guardar() {
    this.guardando = true;
    try {
      if (this.medicion?.id) {
        await this.fichaClinicaService.updateMedicion(this.medicion.id, this.form);
        await this.mostrarToast('Medición actualizada', 'success');
      } else {
        await this.fichaClinicaService.addMedicion(this.pacienteId, this.form);
        await this.mostrarToast('Medición añadida', 'success');
      }
      this.guardado.emit();
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar la medición', 'danger');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Herramienta genérica privada para presentar el componente asíncrono Toast de Ionic.
   *
   * @private
   * @param {string} mensaje - Feedback en string text.
   * @param {string} color - El theme tipográfico para Ionic ('success'/'danger').
   * @returns {Promise<void>}
   */
  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}