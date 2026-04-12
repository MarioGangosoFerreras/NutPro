import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import { IonButton, IonIcon, IonSpinner, IonItem, IonLabel, IonInput, IonTextarea, IonToggle, ToastController, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

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
  @Input() pacienteId!: string;

  encuesta: any = null;
  loading = false;
  guardando = false;
  cambios = false;
  formEncuesta: any = {};

  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({ saveOutline });
  }

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

  marcarCambios() { this.cambios = true; }

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

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}