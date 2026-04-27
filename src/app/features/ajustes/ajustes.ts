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
    IonAvatar,
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
  private cdr = inject(ChangeDetectorRef);
  private menuCtrl = inject(MenuController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  supabase = this.supabaseService.client;

  conectado = false;
  cargandoPerfil = true;
  guardandoPerfil = false;
  cambiandoPassword = false;

  // ─── DATOS DEL PERFIL COMPLETOS ───
  perfil = {
    usuario_id: '',
    nutricionista_id: '',
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
    avatar_url: '',
  };

  centros: CentroConsulta[] = [{ nombre: '', direccion: '' }];

  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  // Contraseñas
  passwords = { nueva: '', confirmacion: '' };

  constructor() {
    addIcons({
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
    });
  }

  get collapsed() {
    return Shell.isCollapsed();
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

  // ─── LÓGICA DE PERFIL ───

  async cargarDatosPerfil() {
    this.cargandoPerfil = true;
    try {
      const authUser = await this.authService.getUser();
      if (!authUser.data.user) return;

      // 1. Cargamos el usuario
      const { data: usuario, error: errU } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.data.user.id)
        .single();

      if (errU) throw errU;

      if (usuario) {
        // 2. Cargamos el nutricionista vinculado
        const { data: nutri, error: errN } = await this.supabase
          .from('nutricionistas')
          .select('*')
          .eq('usuario_id', usuario.id)
          .single();

        console.log('DEBUG: Usuario encontrado:', usuario.id);
        console.log('DEBUG: Nutricionista encontrado:', nutri?.id);

        if (!nutri) {
          console.warn(
            'CUIDADO: No se encontró fila en la tabla nutricionistas para este usuario.',
          );
        }

        this.perfil = {
          usuario_id: usuario.id,
          nutricionista_id: nutri?.id || '',
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
    if (!this.perfil.usuario_id || !this.perfil.nutricionista_id) {
      await this.mostrarToast('Error: No se identificó al nutricionista', 'danger');
      return;
    }

    this.guardandoPerfil = true;
    try {
      if (this.avatarFile) {
        const url = await this.cloudinaryService.uploadImage(this.avatarFile);
        if (url) this.perfil.avatar_url = url;
      }

      // 1. Actualizar Usuarios
      const { error: errUsr } = await this.supabase
        .from('usuarios')
        .update({
          nombre: this.perfil.nombre,
          apellidos: this.perfil.apellidos,
          avatar_url: this.perfil.avatar_url,
        })
        .eq('id', this.perfil.usuario_id);

      if (errUsr) throw errUsr;

      // 2. Actualizar Nutricionistas (Añadimos .select() para confirmar)
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
        .eq('id', this.perfil.nutricionista_id)
        .select(); // <--- IMPORTANTE: Pedimos que nos devuelva la fila

      if (errNutri) throw errNutri;

      // SI DATA ES VACÍO, ES PORQUE EL RLS BLOQUEÓ LA OPERACIÓN
      if (!dataNutri || dataNutri.length === 0) {
        throw new Error(
          'No tienes permisos suficientes para actualizar estos datos o la fila no existe.',
        );
      }

      console.log('DEBUG: Datos guardados correctamente en DB:', dataNutri[0]);

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

  // ─── LÓGICA DE CONTRASEÑA E INTEGRACIONES ───

  async cambiarPassword() {
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
      const { error } = await this.supabase.auth.updateUser({ password: this.passwords.nueva });
      if (error) throw error;

      this.passwords = { nueva: '', confirmacion: '' };
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
