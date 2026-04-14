import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CitasService, Cita } from '../../../core/services/citas';
@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, CommonModule],
  templateUrl: './modal-cita.html',
})
export class ModalCitaComponent implements OnInit {
  @Input() cita?: Cita;
  @Input() pacienteId!: string;
  @Input() nutricionistaId!: string;

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private citasService = inject(CitasService);

  guardando = false;
  hoy = new Date().toISOString();

  form = this.fb.group({
    fecha_hora: ['', Validators.required],
    tipo: ['presencial', Validators.required],
    duracion_min: [60, Validators.required],
    notas: [''],
    url_videollamada: [''],
  });

  ngOnInit() {
    if (this.cita) {
      this.form.patchValue(this.cita as any);
    }
  }

  async guardar() {
    if (this.form.invalid) return;
    this.guardando = true;
    const valores = this.form.value;

    // ✅ Elimina el offset del datetime de ion-datetime
    // "2025-04-14T10:30:00+02:00" → "2025-04-14T10:30:00"
    const fechaRaw = valores.fecha_hora as string;
    const fechaSinOffset = fechaRaw.substring(0, 16); // "2025-04-14T10:30"

    try {
      const payload = { ...valores, fecha_hora: fechaSinOffset };

      const cita = this.cita
        ? await this.citasService.editarCita(this.cita.id!, payload as any)
        : await this.citasService.crearCita({
            ...(payload as any),
            paciente_id: this.pacienteId,
            nutricionista_id: this.nutricionistaId,
          });

      this.modalCtrl.dismiss(cita, 'guardado');
    } catch (e) {
      console.error(e);
      this.guardando = false;
    }
  }

  cerrar() {
    this.modalCtrl.dismiss(null, 'cancelar');
  }
}
