import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../../../core/services/pacientes';
import { CloudinaryService } from '../../../../../core/services/cloudinary';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonAvatar,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ToastController,
  AlertController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonCol,
  IonGrid,
  IonRow,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  calendarOutline,
  callOutline,
  mailOutline,
  locationOutline,
  createOutline,
  closeOutline,
  saveOutline,
  cameraOutline,
  trashOutline,
  cardOutline,
  briefcaseOutline,
  heartOutline,
  flagOutline,
  addOutline,
  closeCircle,
} from 'ionicons/icons';

@Component({
  selector: 'app-tab-resumen',
  imports: [
    FormsModule,
    IonIcon,
    IonItem,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonCol,
    IonGrid,
    IonRow,
    IonSpinner,
    IonButton,
    IonSelectOption,
    IonAvatar, 
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonAvatar
],
  templateUrl: './tab-resumen.html',
  styleUrl: './tab-resumen.css',
})
export class TabResumen {
  @Input() paciente: any;
  @Output() pacienteActualizado = new EventEmitter<any>();
  @Output() eliminarPaciente = new EventEmitter<void>();

  editando = false;
  guardando = false;
  menuAbierto = false;
  form: any = {};
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  nuevaAlergia = '';
  nuevaIntolerancia = '';

  constructor(
    private pacientesService: PacientesService,
    private cloudinaryService: CloudinaryService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      personCircleOutline, calendarOutline, callOutline, mailOutline,
      locationOutline, createOutline, closeOutline, saveOutline,
      cameraOutline, trashOutline, cardOutline, briefcaseOutline,
      heartOutline, flagOutline, addOutline, closeCircle
    });
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.cdr.detectChanges();
  }

  iniciarEdicion() {
    this.form = {
      nombre: this.paciente.usuario?.nombre,
      apellidos: this.paciente.usuario?.apellidos,
      email: this.paciente.email,
      telefono: this.paciente.telefono,
      direccion: this.paciente.direccion,
      fecha_nacimiento: this.paciente.fecha_nacimiento,
      sexo: this.paciente.sexo,
      dni: this.paciente.dni,
      ocupacion: this.paciente.ocupacion,
      estado_civil: this.paciente.estado_civil,
      nacionalidad: this.paciente.nacionalidad,
      motivo_consulta: this.paciente.motivo_consulta,
      avatar_url: this.paciente.usuario?.avatar_url,
      alergias: [...(this.paciente.alergias || [])],
      intolerancias: [...(this.paciente.intolerancias || [])],
    };
    this.editando = true;
    this.cdr.detectChanges();
  }

  cancelarEdicion() {
    this.editando = false;
    this.avatarPreview = null;
    this.avatarFile = null;
    this.cdr.detectChanges();
  }

  onAvatarChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  async guardar() {
    this.guardando = true;
    try {
      if (this.avatarFile) {
        const url = await this.cloudinaryService.uploadImage(this.avatarFile);
        if (url) this.form.avatar_url = url;
        else {
          await this.mostrarToast('Error al subir la imagen', 'danger');
          return;
        }
      }
      await this.pacientesService.actualizarPaciente(this.paciente.id, this.form);

      const pacienteActualizado = {
        ...this.paciente,
        usuario: {
          ...this.paciente.usuario,
          nombre: this.form.nombre,
          apellidos: this.form.apellidos,
          avatar_url: this.form.avatar_url,
        },
        email: this.form.email,
        telefono: this.form.telefono,
        direccion: this.form.direccion,
        fecha_nacimiento: this.form.fecha_nacimiento,
        sexo: this.form.sexo,
        dni: this.form.dni,
        ocupacion: this.form.ocupacion,
        estado_civil: this.form.estado_civil,
        nacionalidad: this.form.nacionalidad,
        motivo_consulta: this.form.motivo_consulta,
        alergias: [...this.form.alergias],
        intolerancias: [...this.form.intolerancias],
      };

      this.pacienteActualizado.emit(pacienteActualizado);
      this.editando = false;
      this.avatarPreview = null;
      this.avatarFile = null;
      await this.mostrarToast('Paciente actualizado correctamente', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar los cambios', 'danger');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  agregarTag(tipo: 'alergias' | 'intolerancias', input: string) {
    const valor = input.trim();
    if (!valor || this.form[tipo].includes(valor)) return;
    this.form[tipo] = [...this.form[tipo], valor];
    if (tipo === 'alergias') this.nuevaAlergia = '';
    else this.nuevaIntolerancia = '';
    this.cdr.detectChanges();
  }

  eliminarTag(tipo: 'alergias' | 'intolerancias', index: number) {
    this.form[tipo] = this.form[tipo].filter((_: any, i: number) => i !== index);
    this.cdr.detectChanges();
  }

  onTagKeydown(event: KeyboardEvent, tipo: 'alergias' | 'intolerancias', valor: string) {
    if (event.key === 'Enter') this.agregarTag(tipo, valor);
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
