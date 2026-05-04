import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';

/**
 * Componente encargado del inicio de sesión de los usuarios (pacientes y nutricionistas).
 * También gestiona la vista y lógica para la recuperación de contraseñas.
 *
 * @export
 * @class Login
 */
@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    IonContent,
    RouterLink,
    IonInput,
    IonButton,
    IonSpinner,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  modoRecuperar = false;

  /**
   * Crea una instancia del componente Login.
   *
   * @param {AuthService} authService - Servicio para manejar la autenticación en Supabase.
   * @param {Router} router - Servicio de enrutamiento para navegar tras el login exitoso.
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  /**
   * Alterna entre el modo de inicio de sesión normal y el modo de recuperación de contraseña.
   * También limpia los mensajes de error y éxito previos.
   */
  toggleModoRecuperar() {
    this.modoRecuperar = !this.modoRecuperar;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Ejecuta el proceso de inicio de sesión utilizando el email y contraseña proporcionados.
   * Si tiene éxito, redirige al usuario a su panel correspondiente según su rol (paciente o nutricionista).
   *
   * @returns {Promise<void>}
   */
  async onLogin() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { error } = await this.authService.signIn(this.email, this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = 'Email o contraseña incorrectos';
    } else {
      const usuario = await this.authService.getUsuario();

      if (usuario?.rol === 'paciente') {
        this.router.navigate(['/portal-paciente']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  /**
   * Solicita el envío de un correo electrónico para restablecer la contraseña del usuario.
   * Dependiendo del resultado de la petición, muestra un mensaje de éxito o de error.
   *
   * @returns {Promise<void>}
   */
  async recuperarPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email) {
      this.errorMessage = 'Introduce tu correo electrónico primero';
      return;
    }

    this.loading = true;
    const { error } = await this.authService.resetPasswordForEmail(this.email);
    this.loading = false;

    if (error) {
      this.errorMessage = 'Error al enviar el correo. Asegúrate de que el formato sea correcto.';
    } else {
      this.successMessage = '¡Listo! Te hemos enviado un enlace para recuperar tu contraseña al correo.';
    }
  }
}