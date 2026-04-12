import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonInput, IonSelect, IonSelectOption,
  IonButton, IonSpinner, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, personCircleOutline, addOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { SupabaseService } from '../../../core/services/supabase';

interface CentroConsulta {
  nombre: string;
  direccion: string;
}

@Component({
  selector: 'app-register',
  imports: [
    FormsModule, RouterLink,
    IonContent, IonInput, IonSelect, IonSelectOption,
    IonButton, IonSpinner, IonIcon
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
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
  centros: CentroConsulta[] = [{ nombre: '', direccion: '' }];

  // Facturación
  dniFiscal = '';
  direccionFiscal = '';

  // Avatar
  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
    private supabase: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ cameraOutline, personCircleOutline, addOutline, trashOutline });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => { this.avatarPreview = e.target.result; };
    reader.readAsDataURL(file);
  }

  addCentro() {
    this.centros.push({ nombre: '', direccion: '' });
  }

  removeCentro(index: number) {
    this.centros.splice(index, 1);
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
          titulacion: this.titulacion,
          especialidad: this.especialidad,
          nombre_empresa: this.nombreEmpresa,
          avatar_url: avatarUrl
          // Nota: El 'estado' no lo enviamos, lo pone el trigger por defecto
        }
      );

      if (error) throw error;

      // ELIMINA EL PASO DE: await this.supabase.client.from('nutricionistas').insert(...)
      // El trigger ya lo hizo automáticamente.

      // 4. Centros de consulta (Esto sí puedes hacerlo aquí si necesitas el ID)
      // Pero ojo: necesitas buscar el nutricionista_id que el trigger acaba de crear

      this.router.navigate(['/pendiente-verificacion']);

    } catch (err: any) {
      this.errorMessage = err.message;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}