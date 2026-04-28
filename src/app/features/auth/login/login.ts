import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonText
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

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  async onLogin() {
    this.loading = true;
    this.errorMessage = '';

    const { error } = await this.authService.signIn(this.email, this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = 'Email o contraseña incorrectos';
    } else {
      // Verificamos qué tipo de usuario acaba de entrar
      const usuario = await this.authService.getUsuario();

      if (usuario?.rol === 'paciente') {
        this.router.navigate(['/portal-paciente']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }
}