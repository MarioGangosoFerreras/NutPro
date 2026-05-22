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

/**
 * Interfaz que define la estructura de un centro de consulta.
 * @interface CentroConsulta
 */
interface CentroConsulta {
  nombre: string;
  direccion: string;
}

/**
 * Página de ajustes para la aplicación NutPro.
 * Esta página permite al usuario gestionar su perfil, cambiar contraseña,
 * conectar o desconectar Google Calendar, y editar información personal.
 * @class AjustesPage
 * @implements {ViewWillEnter}
 * @implements {OnInit}
 */
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
  /** Servicio de Google Calendar inyectado. */
  private gcalService = inject(GoogleCalendarService);
  /** Servicio de autenticación inyectado. */
  private authService = inject(AuthService);
  /** Servicio de Supabase inyectado. */
  private supabaseService = inject(SupabaseService);
  /** Servicio de Cloudinary inyectado. */
  private cloudinaryService = inject(CloudinaryService);
  /** Servicio de pacientes inyectado. */
  private pacientesService = inject(PacientesService);
  /** Detector de cambios inyectado. */
  private cdr = inject(ChangeDetectorRef);
  /** Controlador de menú inyectado. */
  private menuCtrl = inject(MenuController);
  /** Controlador de toast inyectado. */
  private toastCtrl = inject(ToastController);
  /** Controlador de loading inyectado. */
  private loadingCtrl = inject(LoadingController);

  /** Cliente de Supabase. */
  supabase = this.supabaseService.client;

  /** Indica si está conectado a Google Calendar. */
  conectado = false;
  /** Indica si se está cargando el perfil. */
  cargandoPerfil = true;
  /** Indica si se está guardando el perfil. */
  guardandoPerfil = false;
  /** Indica si se está cambiando la contraseña. */
  cambiandoPassword = false;

  /** Rol del usuario. */
  rol = '';

  /** Objeto que contiene la información del perfil del usuario. */
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

  /** Lista de centros de consulta. */
  centros: CentroConsulta[] = [{ nombre: '', direccion: '' }];

  /** Archivo de avatar seleccionado. */
  avatarFile: File | null = null;
  /** Vista previa del avatar. */
  avatarPreview: string | null = null;

  /** Objeto que contiene las contraseñas para cambio. */
  passwords = { actual: '', nueva: '', confirmacion: '' };

  /**
   * Constructor de la clase.
   * Añade los iconos necesarios.
   */
  constructor() {
    addIcons({
      logoGoogle, checkmarkCircle, personCircleOutline, cameraOutline,
      lockClosedOutline, saveOutline, linkOutline, eyeOutline, eyeOffOutline,
      medkitOutline, businessOutline, documentTextOutline, addOutline, trashOutline,
    });
  }

  /**
   * Getter que indica si el shell está colapsado.
   * @returns {boolean} True si está colapsado.
   */
  get collapsed() {
    return Shell.isCollapsed();
  }

  /**
   * Getter que indica si el usuario está en modo recuperación de contraseña.
   * @returns {boolean} True si está recuperando.
   */
  get isRecovering() {
    return this.authService.isRecoveringPassword;
  }

  /**
   * Alterna el estado del menú.
   * Si el ancho de ventana es >= 992px, colapsa/expande el shell, sino alterna el menú lateral.
   */
  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  /**
   * Método del ciclo de vida OnInit.
   * Carga los datos del perfil al inicializar.
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarDatosPerfil();
  }

  /**
   * Método del ciclo de vida ViewWillEnter.
   * Verifica la conexión a Google Calendar.
   * @returns {Promise<void>}
   */
  async ionViewWillEnter() {
    this.conectado = await this.gcalService.estaConectado();
    this.cdr.detectChanges();
  }

  /**
   * Carga los datos del perfil del usuario desde la base de datos.
   * @returns {Promise<void>}
   */
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

  /**
   * Maneja el cambio de archivo de avatar.
   * @param {any} event - Evento del input file.
   */
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

  /**
   * Añade un nuevo centro de consulta a la lista.
   */
  addCentro() {
    this.centros.push({ nombre: '', direccion: '' });
  }

  /**
   * Elimina un centro de consulta de la lista por índice.
   * @param {number} index - Índice del centro a eliminar.
   */
  removeCentro(index: number) {
    this.centros.splice(index, 1);
  }

  /**
   * Guarda el perfil del usuario.
   * Actualiza la información en la base de datos y sube el avatar si es necesario.
   * @returns {Promise<void>}
   */
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

  /**
   * Cambia la contraseña del usuario.
   * Verifica la contraseña actual si no está en modo recuperación.
   * @returns {Promise<void>}
   */
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
      if (!this.isRecovering) {
        const { error: authErr } = await this.authService.signIn(this.perfil.email, this.passwords.actual);
        if (authErr) {
          throw new Error('La contraseña actual es incorrecta');
        }
      }

      const { error } = await this.supabase.auth.updateUser({ password: this.passwords.nueva });
      if (error) throw error;

      this.passwords = { actual: '', nueva: '', confirmacion: '' };
      this.authService.isRecoveringPassword = false;

      await this.mostrarToast('Contraseña actualizada con éxito', 'success');
    } catch (e: any) {
      console.error(e);
      await this.mostrarToast(e.message || 'Error al cambiar contraseña', 'danger');
    } finally {
      this.cambiandoPassword = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Alterna la conexión a Google Calendar.
   * Si está conectado, desconecta; si no, inicia OAuth.
   * @returns {Promise<void>}
   */
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

  /**
   * Muestra un toast con el mensaje y color especificados.
   * @private
   * @param {string} mensaje - Mensaje a mostrar.
   * @param {string} color - Color del toast.
   * @returns {Promise<void>}
   */
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