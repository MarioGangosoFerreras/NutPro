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
  successMessage = ''; // Mensaje de éxito al enviar el correo
  modoRecuperar = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleModoRecuperar() {
    this.modoRecuperar = !this.modoRecuperar;
    this.errorMessage = '';
    this.successMessage = '';
  }

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