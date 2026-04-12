import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../../core/services/ficha-clinica';
import {
  IonContent, IonButton, IonIcon, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';

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
  @Input() titulo = 'Nueva medición';
  @Input() pacienteId!: string;
  /** Si se pasa, es modo edición; si no, es modo creación */
  @Input() medicion: any = null;

  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  form: any = {};
  guardando = false;

  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({ closeOutline, saveOutline });
  }

  ngOnInit() {
    if (this.medicion) {
      this.form = { ...this.medicion };
    } else {
      this.resetForm();
    }
  }

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

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}