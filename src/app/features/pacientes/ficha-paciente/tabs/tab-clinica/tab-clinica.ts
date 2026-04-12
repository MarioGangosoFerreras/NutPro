import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import {
  IonButton, IonIcon, IonSpinner, IonItem, IonLabel,
  IonInput, IonSelect, IonSelectOption, IonTextarea, IonToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tab-clinica',
  imports: [
    FormsModule,
    IonButton, IonIcon, IonSpinner, IonItem, IonLabel,
    IonInput, IonSelect, IonSelectOption, IonTextarea, IonToggle,
  ],
  templateUrl: './tab-clinica.html',
  styleUrl: './tab-clinica.css',
})
export class TabClinica implements OnInit {
  @Input() pacienteId!: string;

  antFamiliares: any = null;
  antPersonales: any = null;
  loading = false;
  guardando = false;
  cambios = false;

  formAntFam: any = {};
  formAntPer: any = {};

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
      const [fam, per] = await Promise.all([
        this.fichaClinicaService.getAntecedentesFamiliares(this.pacienteId),
        this.fichaClinicaService.getAntecedentesPersonales(this.pacienteId),
      ]);
      this.antFamiliares = fam;
      this.antPersonales = per;
      this.formAntFam = fam
        ? { ...fam }
        : { hta: false, ecv: false, diabetes: false, enfermedad_autoinmune: false, alergias: false, obesidad: false, cancer: false, otra: '' };
      this.formAntPer = per
        ? { ...per }
        : { alcohol: false, tabaco: false, cirugias: false, alergias: false, enfermedad_patologia: '', medicacion: '', digestiones: '', menstruacion: '', suplementos_nutricionales: '', descansa_bien: false, actividad_fisica: null };
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
      await Promise.all([
        this.fichaClinicaService.upsertAntecedentesFamiliares(this.pacienteId, this.formAntFam),
        this.fichaClinicaService.upsertAntecedentesPersonales(this.pacienteId, this.formAntPer),
      ]);
      this.cambios = false;
      await this.mostrarToast('Antecedentes guardados', 'success');
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