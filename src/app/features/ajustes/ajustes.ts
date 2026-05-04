import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonButtons,
  ViewWillEnter,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonSpinner,
  IonAvatar,
  ToastController,
  LoadingController,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { GoogleCalendarService } from '../../core/services/google-calendar';
import { AuthService } from '../../core/services/auth';
import { SupabaseService } from '../../core/services/supabase';
import { CloudinaryService } from '../../core/services/cloudinary';
import { PacientesService } from '../../core/services/pacientes';
import { MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoGoogle,
  checkmarkCircle,
  personCircleOutline,
  cameraOutline,
  lockClosedOutline,
  saveOutline,
  linkOutline,
  eyeOutline,
  eyeOffOutline,
  medkitOutline,
  businessOutline,
  documentTextOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { Shell } from '../../shared/components/shell/shell';

interface CentroConsulta {
  nombre: string;
  direccion: string;
}

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonSpinner,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './ajustes.html',
  styleUrls: ['./ajustes.css'],
})
export class AjustesPage implements ViewWillEnter, OnInit {
  private gcalService = inject(GoogleCalendarService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private cloudinaryService = inject(CloudinaryService);
  private pacientesService = inject(PacientesService);
  private cdr = inject(ChangeDetectorRef);
  private menuCtrl = inject(MenuController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  supabase = this.supabaseService.client;

  conectado = false;
  cargandoPerfil = true;
  guardandoPerfil = false;
  cambiandoPassword = false;

  rol = '';

  perfil = {
    usuario_id: '',
    entidad_id: '',
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    especialidad: '',
    numero_colegiado: '',
    titulacion: '',
    nombre_empresa: '',
    dni_fiscal: '',
    direccion_fiscal: '',
    dni: '',
    fecha_nacimiento: '',
    sexo: '',
    direccion: '',
    avatar_url: '',
  };

  centros: CentroConsulta[] = [{ nombre: '', direccion: '' }];

  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  // Añadimos el campo "actual" a las contraseñas
  passwords = { actual: '', nueva: '', confirmacion: '' };

  constructor() {
    addIcons({
      logoGoogle, checkmarkCircle, personCircleOutline, cameraOutline,
      lockClosedOutline, saveOutline, linkOutline, eyeOutline, eyeOffOutline,
      medkitOutline, businessOutline, documentTextOutline, addOutline, trashOutline,
    });
  }

  get collapsed() {
    return Shell.isCollapsed();
  }

  // Comprueba si viene del correo de recuperación
  get isRecovering() {
    return this.authService.isRecoveringPassword;
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  async ngOnInit() {
    await this.cargarDatosPerfil();
  }

  async ionViewWillEnter() {
    this.conectado = await this.gcalService.estaConectado();
    this.cdr.detectChanges();
  }

  async cargarDatosPerfil() {
    this.cargandoPerfil = true;
    try {
      const authUser = await this.authService.getUser();
      if (!authUser.data.user) return;

      const { data: usuario, error: errU } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.data.user.id)
        .single();

      if (errU) throw errU;

      if (usuario) {
        this.rol = usuario.rol;

        if (this.rol === 'paciente') {
          const pac = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
          if (pac) {
            this.perfil = {
              ...this.perfil,
              usuario_id: usuario.id,
              entidad_id: pac.id,
              nombre: usuario.nombre || '',
              apellidos: usuario.apellidos || '',
              email: usuario.email || authUser.data.user.email || '',
              telefono: pac.telefono || '',
              dni: pac.dni || '',
              fecha_nacimiento: pac.fecha_nacimiento || '',
              sexo: pac.sexo || '',
              direccion: pac.direccion || '',
              avatar_url: usuario.avatar_url || '',
            };
          }
        } else {
          const { data: nutri, error: errN } = await this.supabase
            .from('nutricionistas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .single();

          this.perfil = {
            ...this.perfil,
            usuario_id: usuario.id,
            entidad_id: nutri?.id || '',
            nombre: usuario.nombre || '',
            apellidos: usuario.apellidos || '',
            email: usuario.email || authUser.data.user.email || '',
            telefono: nutri?.telefono || '',
            numero_colegiado: nutri?.numero_colegiado || '',
            titulacion: nutri?.titulacion || '',
            especialidad: nutri?.especialidad || '',
            nombre_empresa: nutri?.nombre_empresa || '',
            dni_fiscal: nutri?.dni_fiscal || '',
            direccion_fiscal: nutri?.direccion_fiscal || '',
            avatar_url: usuario.avatar_url || '',
          };

          if (nutri?.centros) {
            this.centros = Array.isArray(nutri.centros)
              ? nutri.centros
              : [{ nombre: '', direccion: '' }];
          }
        }
      }
    } catch (e) {
      console.error('Error cargando perfil:', e);
    } finally {
      this.cargandoPerfil = false;
      this.cdr.detectChanges();
    }
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

  addCentro() {
    this.centros.push({ nombre: '', direccion: '' });
  }

  removeCentro(index: number) {
    this.centros.splice(index, 1);
  }

  async guardarPerfil() {
    if (!this.perfil.usuario_id || !this.perfil.entidad_id) {
      await this.mostrarToast('Error: No se identificó al usuario correctamente', 'danger');
      return;
    }

    this.guardandoPerfil = true;
    try {
      if (this.avatarFile) {
        const url = await this.cloudinaryService.uploadImage(this.avatarFile);
        if (url) this.perfil.avatar_url = url;
      }

      if (this.rol === 'paciente') {
        await this.pacientesService.actualizarPaciente(this.perfil.entidad_id, {
          ...this.perfil
        });
      } else {
        const { error: errUsr } = await this.supabase
          .from('usuarios')
          .update({
            nombre: this.perfil.nombre,
            apellidos: this.perfil.apellidos,
            avatar_url: this.perfil.avatar_url,
          })
          .eq('id', this.perfil.usuario_id);

        if (errUsr) throw errUsr;

        const { data: dataNutri, error: errNutri } = await this.supabase
          .from('nutricionistas')
          .update({
            telefono: this.perfil.telefono,
            numero_colegiado: this.perfil.numero_colegiado,
            titulacion: this.perfil.titulacion,
            especialidad: this.perfil.especialidad,
            nombre_empresa: this.perfil.nombre_empresa,
            dni_fiscal: this.perfil.dni_fiscal,
            direccion_fiscal: this.perfil.direccion_fiscal,
            centros: this.centros,
          })
          .eq('id', this.perfil.entidad_id)
          .select();

        if (errNutri) throw errNutri;

        if (!dataNutri || dataNutri.length === 0) {
          throw new Error('No tienes permisos suficientes para actualizar estos datos o la fila no existe.');
        }
      }

      this.avatarFile = null;
      this.avatarPreview = null;
      await this.mostrarToast('¡Perfil actualizado con éxito!', 'success');

      window.dispatchEvent(new Event('perfilActualizado'));
    } catch (e: any) {
      console.error('ERROR CRÍTICO AL GUARDAR:', e);
      await this.mostrarToast(e.message || 'Error desconocido al guardar', 'danger');
    } finally {
      this.guardandoPerfil = false;
      this.cdr.detectChanges();
    }
  }

  // ─── ACTUALIZADO PARA SOLICITAR CONTRASEÑA ANTIGUA ───
  async cambiarPassword() {
    if (!this.isRecovering && !this.passwords.actual) {
      await this.mostrarToast('Debes introducir tu contraseña actual', 'warning');
      return;
    }

    if (this.passwords.nueva.length < 6) {
      await this.mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    if (this.passwords.nueva !== this.passwords.confirmacion) {
      await this.mostrarToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    this.cambiandoPassword = true;
    try {
      // Si NO está en modo recuperar, verificamos primero si la contraseña actual es la correcta
      // La forma más eficiente con Supabase de hacer esto es forzar un SignIn
      if (!this.isRecovering) {
        const { error: authErr } = await this.authService.signIn(this.perfil.email, this.passwords.actual);
        if (authErr) {
          throw new Error('La contraseña actual es incorrecta');
        }
      }

      const { error } = await this.supabase.auth.updateUser({ password: this.passwords.nueva });
      if (error) throw error;

      this.passwords = { actual: '', nueva: '', confirmacion: '' };
      this.authService.isRecoveringPassword = false; // Ya la hemos cambiado, desactivamos el modo

      await this.mostrarToast('Contraseña actualizada con éxito', 'success');
    } catch (e: any) {
      console.error(e);
      await this.mostrarToast(e.message || 'Error al cambiar contraseña', 'danger');
    } finally {
      this.cambiandoPassword = false;
      this.cdr.detectChanges();
    }
  }

  async toggleConexion() {
    const loading = await this.loadingCtrl.create({
      spinner: 'crescent',
      message: 'Procesando...',
    });
    await loading.present();

    if (this.conectado) {
      await this.gcalService.desconectar();
      this.conectado = false;
      await loading.dismiss();
    } else {
      await loading.dismiss();
      this.gcalService.iniciarOAuth();
    }
    this.cdr.detectChanges();
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