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

  datos = {
    nombre: '',
    apellidos: '',
    dni: '',
    fecha_nacimiento: '', // <--- AÑADIDO
    sexo: '',             // <--- AÑADIDO
    direccion: '',        // <--- AÑADIDO
    motivo_consulta: '',  // <--- AÑADIDO
    email: '',
    telefono: '',
    password: '',
    confirmarPassword: ''
  };

  constructor() {
    addIcons({ personAddOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.nutriId = this.route.snapshot.queryParamMap.get('ref') || '';
    if (!this.nutriId) {
      this.errorMessage.set('El enlace de invitación no es válido. Contacta con tu nutricionista.');
    }
  }

  // Comprobamos que todo esté relleno
  get formularioValido(): boolean {
    return !!(this.datos.nombre && this.datos.apellidos && this.datos.dni &&
      this.datos.fecha_nacimiento && this.datos.sexo && this.datos.direccion &&
      this.datos.motivo_consulta && this.datos.email && this.datos.telefono &&
      this.datos.password);
  }

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
          fecha_nacimiento: this.datos.fecha_nacimiento, // <--- ENVIAMOS
          sexo: this.datos.sexo,                         // <--- ENVIAMOS
          direccion: this.datos.direccion.trim(),        // <--- ENVIAMOS
          motivo_consulta: this.datos.motivo_consulta.trim(), // <--- ENVIAMOS
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

  private async mostrarToast(m: string, c: string) {
    const t = await this.toastCtrl.create({ message: m, color: c, duration: 2500, position: 'bottom' });
    t.present();
  }
}