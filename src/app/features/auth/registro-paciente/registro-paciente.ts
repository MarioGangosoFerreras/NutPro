import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonInput, IonButton, IonSpinner, IonIcon,
  ToastController, IonItem, IonLabel, IonText, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';

/**
 * Componente que gestiona el registro de nuevos pacientes a través de un enlace de invitación.
 * Captura los datos personales y de acceso del paciente y los asocia al nutricionista que envió la invitación.
 *
 * @export
 * @class RegistroPaciente
 * @implements {OnInit}
 */
@Component({
  selector: 'app-registro-paciente',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, IonContent, IonInput,
    IonButton, IonSpinner, IonText,
    IonSelect, IonSelectOption // <--- Importamos los select
  ],
  templateUrl: './registro-paciente.html',
  styleUrl: './registro-paciente.css'
})
export class RegistroPaciente implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  nutriId = '';
  loading = signal(false);
  errorMessage = signal('');

  /** Objeto que almacena todos los datos introducidos por el paciente en el formulario */
  datos = {
    nombre: '',
    apellidos: '',
    dni: '',
    fecha_nacimiento: '', 
    sexo: '',             
    direccion: '',        
    motivo_consulta: '', 
    email: '',
    telefono: '',
    password: '',
    confirmarPassword: ''
  };

  /**
   * Crea una instancia del componente y registra los iconos de Ionic a utilizar.
   */
  constructor() {
    addIcons({ personAddOutline, checkmarkCircleOutline });
  }

  /**
   * Método del ciclo de vida de Angular. Se ejecuta al inicializar el componente.
   * Extrae el ID del nutricionista (`ref`) de los parámetros de la URL para vincular al paciente.
   *
   * @returns {void}
   */
  ngOnInit() {
    this.nutriId = this.route.snapshot.queryParamMap.get('ref') || '';
    if (!this.nutriId) {
      this.errorMessage.set('El enlace de invitación no es válido. Contacta con tu nutricionista.');
    }
  }

  /**
   * Getter que comprueba si todos los campos obligatorios del formulario han sido rellenados.
   *
   * @readonly
   * @type {boolean}
   */
  // Comprobamos que todo esté relleno
  get formularioValido(): boolean {
    return !!(this.datos.nombre && this.datos.apellidos && this.datos.dni &&
      this.datos.fecha_nacimiento && this.datos.sexo && this.datos.direccion &&
      this.datos.motivo_consulta && this.datos.email && this.datos.telefono &&
      this.datos.password);
  }

  /**
   * Ejecuta el proceso de registro del paciente validando primero las contraseñas
   * y luego creando la cuenta a través del servicio de autenticación con los metadatos requeridos.
   *
   * @returns {Promise<void>}
   */
  async registrar() {
    if (this.datos.password !== this.datos.confirmarPassword) {
      this.mostrarToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    if (this.datos.password.length < 6) {
      this.mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    this.loading.set(true);
    try {
      const { error } = await this.authService.signUp(
        this.datos.email.trim(),
        this.datos.password,
        {
          nombre: this.datos.nombre.trim(),
          apellidos: this.datos.apellidos.trim(),
          dni: this.datos.dni.trim(),
          fecha_nacimiento: this.datos.fecha_nacimiento, 
          sexo: this.datos.sexo,                         
          direccion: this.datos.direccion.trim(),        
          motivo_consulta: this.datos.motivo_consulta.trim(), 
          telefono: this.datos.telefono.trim(),
          rol: 'paciente',
          nutricionista_id: this.nutriId
        }
      );

      if (error) throw error;

      await this.mostrarToast('¡Registro completado! Ya puedes iniciar sesión.', 'success');
      this.router.navigate(['/login']);

    } catch (err: any) {
      this.errorMessage.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Helper privado para mostrar una notificación toast en pantalla.
   *
   * @private
   * @param {string} m - El mensaje a mostrar.
   * @param {string} c - El color del toast (ej. 'success', 'warning', 'danger').
   * @returns {Promise<void>}
   */
  private async mostrarToast(m: string, c: string) {
    const t = await this.toastCtrl.create({ message: m, color: c, duration: 2500, position: 'bottom' });
    t.present();
  }
}