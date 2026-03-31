import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput,
  IonButton, IonSpinner, IonText, IonAvatar, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, personCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { CloudinaryService } from '../../../core/services/cloudinary';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule, RouterLink,
    IonContent, IonInput,
    IonButton, IonSpinner, IonIcon
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  nombre = '';
  apellidos = '';
  email = '';
  password = '';
  confirmPassword = '';
  numeroColegiado = '';
  especialidad = '';

  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
    private router: Router
  ) {
    addIcons({ cameraOutline, personCircleOutline });
  }

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
    this.errorMessage = '';

    // Subir avatar si hay uno seleccionado
    let avatarUrl: string | null = null;
    if (this.avatarFile) {
      avatarUrl = await this.cloudinaryService.uploadImage(this.avatarFile);
    }

    const { error } = await this.authService.signUp(
      this.email,
      this.password,
      {
        nombre: this.nombre,
        apellidos: this.apellidos,
        rol: 'nutricionista',
        numero_colegiado: this.numeroColegiado,
        especialidad: this.especialidad,
        avatar_url: avatarUrl
      }
    );

    this.loading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}