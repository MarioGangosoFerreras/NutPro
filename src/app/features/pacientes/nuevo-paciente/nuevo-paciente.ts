import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import { 
  IonButton, IonContent, IonInput, IonSpinner, IonIcon, 
  IonDatetime, IonDatetimeButton, IonModal
} from '@ionic/angular/standalone';

/**
 * Componente para la creación manual de un nuevo paciente.
 */
@Component({
  selector: 'app-nuevo-paciente',
  imports: [
    FormsModule, RouterLink, Header, IonContent, IonInput, IonButton, IonSpinner, IonIcon,
    IonDatetime, IonDatetimeButton, IonModal
  ],
  templateUrl: './nuevo-paciente.html',
  styleUrl: './nuevo-paciente.css',
})
export class NuevoPaciente implements OnInit {
  nombre = '';
  apellidos = '';
  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  // ✅ FIX: Inicialización segura
  maxDateNacimiento = new Date().toISOString().split('T')[0];
  minDateNacimiento = '1900-01-01';

  datetimeId = 'datetime-' + Math.random().toString(36).substring(2, 9);

  paciente = {
    dni: '',
    fecha_nacimiento: '1990-01-01', 
    sexo: '',
    estado_civil: '',
    telefono: '',
    email: '',
    direccion: '',
    ocupacion: '',
    nacionalidad: '',
    motivo_consulta: '',
    alergias: [] as string[],
    intolerancias: [] as string[],
  };

  alergiasInput = '';
  intoleracionesInput = '';
  loading = false;
  errorMessage = '';

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const hoy = new Date();
    const tzoffset = hoy.getTimezoneOffset() * 60000;
    this.maxDateNacimiento = new Date(Date.now() - tzoffset).toISOString().split('T')[0];

    const minDate = new Date();
    minDate.setFullYear(hoy.getFullYear() - 120);
    this.minDateNacimiento = new Date(minDate.getTime() - tzoffset).toISOString().split('T')[0];
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async guardar() {
    if (
      !this.nombre || !this.apellidos || !this.paciente.dni ||
      !this.paciente.fecha_nacimiento || !this.paciente.sexo ||
      !this.paciente.telefono || !this.paciente.email ||
      !this.paciente.direccion || !this.paciente.motivo_consulta
    ) {
      this.errorMessage = 'Por favor rellena todos los campos obligatorios';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const nutricionistaId = await this.authService.getNutricionistaId();
    if (!nutricionistaId) {
      this.errorMessage = 'No se pudo obtener el nutricionista';
      this.loading = false;
      return;
    }

    this.paciente.alergias = this.alergiasInput
      ? this.alergiasInput.split(',').map((a) => a.trim()).filter((a) => a)
      : [];
    this.paciente.intolerancias = this.intoleracionesInput
      ? this.intoleracionesInput.split(',').map((i) => i.trim()).filter((i) => i)
      : [];

    const { error } = await this.pacientesService.crearPaciente(
      {
        ...this.paciente,
        nombre: this.nombre,
        apellidos: this.apellidos,
        nutricionista_id: nutricionistaId,
      },
      this.avatarFile,
    );

    this.loading = false;

    if (error) {
      this.errorMessage = 'Error al guardar el paciente: ' + error.message;
    } else {
      alert(`✅ Paciente añadido correctamente.\n\nContraseña temporal: su DNI.`);
      this.router.navigate(['/pacientes']);
    }
  }
}