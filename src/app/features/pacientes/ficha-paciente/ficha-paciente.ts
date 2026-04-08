import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../core/services/pacientes';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
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
  flagOutline,
  heartOutline,
  briefcaseOutline,
  cardOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-ficha-paciente',
  imports: [
    Header,
    FormsModule,
    IonContent,
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
  ],
  templateUrl: './ficha-paciente.html',
  styleUrl: './ficha-paciente.css',
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;
  editando = false;
  guardando = false;

  // Copia editable
  form: any = {};
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  constructor(
    private pacientesService: PacientesService,
    private cloudinaryService: CloudinaryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      arrowBackOutline,
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
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }
    try {
      this.paciente = await this.pacientesService.getPacienteById(id);
    } catch (error) {
      console.error('Error cargando paciente:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }

  volver() {
    this.router.navigate(['/pacientes']);
  }

  iniciarEdicion() {
    // Copia profunda para no mutar el objeto original hasta guardar
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
    this.avatarPreview = null;
    this.avatarFile = null;
    this.editando = true;
    this.cdr.detectChanges();
  }

  nuevaAlergia = '';
  nuevaIntolerancia = '';

  agregarTag(tipo: 'alergias' | 'intolerancias', input: string) {
    const valor = input.trim();
    if (!valor) return;
    if (!this.form[tipo].includes(valor)) {
      this.form[tipo] = [...this.form[tipo], valor];
    }
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
      // Si hay nueva imagen, subirla primero
      if (this.avatarFile) {
        const url = await this.cloudinaryService.uploadImage(this.avatarFile);
        if (url) {
          this.form.avatar_url = url;
        } else {
          await this.mostrarToast('Error al subir la imagen', 'danger');
          return; // no continuar si falló la imagen
        }
      }

      await this.pacientesService.actualizarPaciente(this.paciente.id, this.form);

      // Actualizar datos locales sin recargar
      this.paciente.usuario.nombre = this.form.nombre;
      this.paciente.usuario.apellidos = this.form.apellidos;
      this.paciente.usuario.avatar_url = this.form.avatar_url;
      this.paciente.email = this.form.email;
      this.paciente.telefono = this.form.telefono;
      this.paciente.direccion = this.form.direccion;
      this.paciente.fecha_nacimiento = this.form.fecha_nacimiento;
      this.paciente.sexo = this.form.sexo;
      this.paciente.dni = this.form.dni;
      this.paciente.ocupacion = this.form.ocupacion;
      this.paciente.estado_civil = this.form.estado_civil;
      this.paciente.nacionalidad = this.form.nacionalidad;
      this.paciente.motivo_consulta = this.form.motivo_consulta;
      this.paciente.alergias = [...this.form.alergias];
      this.paciente.intolerancias = [...this.form.intolerancias];

      this.editando = false;
      this.avatarPreview = null;
      this.avatarFile = null;

      await this.mostrarToast('Paciente actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar:', error);
      await this.mostrarToast('Error al guardar los cambios', 'danger');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
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

  async confirmarEliminar() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar paciente',
      message: `¿Seguro que quieres eliminar a ${this.paciente.usuario?.nombre} ${this.paciente.usuario?.apellidos}? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => this.eliminar(),
        },
      ],
    });
    await alert.present();
  }

  private async eliminar() {
    try {
      await this.pacientesService.eliminarPaciente(this.paciente.id, this.paciente.usuario_id);
      await this.mostrarToast('Paciente eliminado correctamente', 'success');
      this.router.navigate(['/pacientes']);
    } catch (error) {
      console.error('Error al eliminar:', error);
      await this.mostrarToast('Error al eliminar el paciente', 'danger');
    }
  }
}
