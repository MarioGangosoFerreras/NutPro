import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import {
  IonButton, IonIcon, IonSpinner, IonItem, IonLabel,
  IonInput, IonSelect, IonSelectOption, IonTextarea, IonToggle,
  ToastController,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

/**
 * Componente que gestiona la pestaña de "Clínica" en la ficha del paciente.
 * Permite ver y editar los antecedentes familiares y personales.
 *
 * @export
 * @class TabClinica
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-clinica',
  imports: [
    FormsModule,
    IonButton, IonIcon, IonSpinner, IonItem, IonLabel,
    IonInput, IonSelect, IonSelectOption, IonTextarea, IonToggle, IonFab,
  ],
  templateUrl: './tab-clinica.html',
  styleUrl: './tab-clinica.css',
})
export class TabClinica implements OnInit {
  /** Identificador único del paciente asociado. */
  @Input() pacienteId!: string;

  antFamiliares: any = null;
  antPersonales: any = null;
  loading = false;
  guardando = false;
  cambios = false;

  /** Formulario bidireccional reactivo para antecedentes familiares. */
  formAntFam: any = {};
  /** Formulario bidireccional reactivo para antecedentes personales. */
  formAntPer: any = {};

  /**
   * Crea una instancia de TabClinica e inicializa los iconos a emplear.
   *
   * @param {FichaClinicaService} fichaClinicaService - Interfaz que conecta la lógica local con peticiones de historiales y medidas a BD.
   * @param {ChangeDetectorRef} cdr - Angular CD para reaccionar al binding tras resolver promesas.
   * @param {ToastController} toastCtrl - Dispara avisos flotantes de feedback de UI en la parte de abajo.
   */
  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({ saveOutline });
  }

  /**
   * Al inicializar, busca los registros existentes del paciente. Si los hay, se asignan al modelo
   * (formAntFam, formAntPer); si no, se inicializan con objetos limpios conteniendo su estructura base por defecto.
   *
   * @returns {Promise<void>}
   */
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

  /** Disparado en cada keypress o toggle de UI para iluminar el botón de Guardar Cambios. */
  marcarCambios() { this.cambios = true; }

  /**
   * Hace efectivos los cambios de los dos formularios al mismo tiempo a la vez que resetea el flag de guardado.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Función unificadora para desplegar componentes Toast interactivos.
   *
   * @private
   * @param {string} mensaje - El texto informativo.
   * @param {string} color - El theme tipográfico para Ionic ('success'/'danger').
   * @returns {Promise<void>}
   */
  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}