import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, personCircleOutline, addOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { SupabaseService } from '../../../core/services/supabase';

/**
 * Interfaz que define la estructura de un centro de consulta de un nutricionista.
 *
 * @interface CentroConsulta
 */
interface CentroConsulta {
  /** Nombre del centro, clínica o establecimiento */
  nombre: string;
  /** Dirección física del centro de consulta */
  direccion: string;
}

/**
 * Componente encargado del registro de nuevos nutricionistas en la plataforma.
 * Maneja la recolección de datos personales, profesionales, centros de consulta, facturación y subida de avatar.
 *
 * @export
 * @class Register
 */
@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // Datos personales
  nombre = '';
  apellidos = '';
  email = '';
  telefono = '';
  password = '';
  confirmPassword = '';

  // Datos profesionales
  numeroColegiado = '';
  titulacion = '';
  especialidad = '';
  nombreEmpresa = '';
  bio = '';

  // Centros de consulta
  /** Lista dinámica de centros donde el nutricionista pasa consulta */
  centros: CentroConsulta[] = [{ nombre: '', direccion: '' }];

  // Facturación
  dniFiscal = '';
  direccionFiscal = '';

  // Avatar
  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  loading = false;
  errorMessage = '';

  /**
   * Crea una instancia del componente Register y registra los iconos usados en la vista.
   *
   * @param {AuthService} authService - Servicio para manejar la creación de cuenta en Auth.
   * @param {CloudinaryService} cloudinaryService - Servicio para la subida de imágenes a Cloudinary.
   * @param {SupabaseService} supabase - Servicio de base de datos de Supabase.
   * @param {Router} router - Servicio de enrutamiento de Angular.
   * @param {ChangeDetectorRef} cdr - Servicio para forzar la detección de cambios en la vista.
   */
  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
    private supabase: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ cameraOutline, personCircleOutline, addOutline, trashOutline });
  }

  /**
   * Manejador ejecutado al seleccionar una imagen para el avatar.
   * Extrae el archivo y genera una vista previa en base64.
   *
   * @param {*} event - Objeto del evento de selección de archivo.
   */
  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Añade un nuevo centro de consulta vacío a la lista dinámica de centros.
   */
  addCentro() {
    this.centros.push({ nombre: '', direccion: '' });
  }

  /**
   * Elimina un centro de consulta de la lista dinámica según el índice proporcionado.
   *
   * @param {number} index - Posición del centro a eliminar en el array.
   */
  removeCentro(index: number) {
    this.centros.splice(index, 1);
  }

  /**
   * Ejecuta el proceso de registro del nutricionista.
   * Valida campos obligatorios, sube el avatar a Cloudinary (si lo hay) 
   * y crea la cuenta en Supabase Auth inyectando los metadatos necesarios.
   *
   * @returns {Promise<void>}
   */
  async onRegister() {
    if (!this.nombre || !this.apellidos || !this.email || !this.password) {
      this.errorMessage = 'Por favor rellena todos los campos obligatorios';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    try {
      let avatarUrl: string | null = null;
      if (this.avatarFile) {
        avatarUrl = await this.cloudinaryService.uploadImage(this.avatarFile);
      }

      // ÚNICO PASO: Registrar en Auth con metadatos
      const { data, error } = await this.authService.signUp(
        this.email.trim(),
        this.password.trim(),
        {
          nombre: this.nombre,
          apellidos: this.apellidos,
          rol: 'nutricionista',
          telefono: this.telefono,
          numero_colegiado: this.numeroColegiado,
          titulacion: this.titulacion ? this.titulacion : null,
          especialidad: this.especialidad,
          nombre_empresa: this.nombreEmpresa,
          avatar_url: avatarUrl,
          dni_fiscal: this.dniFiscal,
          direccion_fiscal: this.direccionFiscal,
          centros: this.centros,
        },
      );

      if (error) throw error;

      this.router.navigate(['/pendiente-verificacion']);
    } catch (err: any) {
      this.errorMessage = err.message;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}