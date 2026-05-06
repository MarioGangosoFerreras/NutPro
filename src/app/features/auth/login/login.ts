// src/app/features/auth/login/login.ts
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  ViewWillEnter,
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
export class Login implements ViewWillEnter {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  modoRecuperar = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
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
    this.cdr.detectChanges(); // Forzamos a que aparezca el spinner

    try {
      // Limpiamos espacios en el email por si el usuario copió y pegó con un espacio al final
      const { error } = await this.authService.signIn(this.email.trim(), this.password);

      if (error) {
        // Aquí es donde cae el error 400. Mostramos el error visual.
        this.errorMessage = 'Email o contraseña incorrectos. Revisa tus datos.';
        console.error('Login fallido:', error.message);
      } else {
        const usuario = await this.authService.getUsuario();

        // AÑADIR LA CONDICIÓN PARA EL ADMIN AQUÍ
        if (usuario?.rol === 'admin') {
          this.router.navigate(['/admin']);
        } else if (usuario?.rol === 'paciente') {
          this.router.navigate(['/portal-paciente']);
        } else {
          // El resto (nutricionistas) va al dashboard
          this.router.navigate(['/dashboard']);
        }
      }
    } catch (err: any) {
      // Por si se cae el internet o hay un error inesperado
      this.errorMessage = 'Ocurrió un error inesperado. Revisa tu conexión.';
      console.error('Excepción en login:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // Obligamos a la UI a quitar el spinner y mostrar el error
    }
  }

  async ionViewWillEnter() {
    const { data } = await this.authService.getSession();
    if (data.session) {
      const usuario = await this.authService.getUsuario();
      if (usuario?.rol === 'admin') {
        this.router.navigate(['/admin']);
      } else if (usuario?.rol === 'paciente') {
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
    this.cdr.detectChanges();

    try {
      const { error } = await this.authService.resetPasswordForEmail(this.email.trim());

      if (error) {
        this.errorMessage = 'Error al enviar el correo. Asegúrate de que el formato sea correcto.';
      } else {
        this.successMessage = '¡Listo! Te hemos enviado un enlace para recuperar tu contraseña al correo.';
      }
    } catch (err) {
      this.errorMessage = 'Error inesperado al conectar con el servidor.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}