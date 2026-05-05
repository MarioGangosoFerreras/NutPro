import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import { 
  IonButton, IonContent, IonInput, IonSpinner, IonIcon, 
  IonDatetime, IonDatetimeButton, IonModal // <-- AÑADIDOS
} from '@ionic/angular/standalone';

/**
 * Componente que proporciona el formulario para la creación manual
 * de un nuevo paciente directamente por parte del nutricionista.
 *
 * @export
 * @class NuevoPaciente
 */
@Component({
  selector: 'app-nuevo-paciente',
  imports: [
    FormsModule, RouterLink, Header, IonContent, IonInput, IonButton, IonSpinner, IonIcon,
    IonDatetime, IonDatetimeButton, IonModal // <-- AÑADIDOS
  ],
  templateUrl: './nuevo-paciente.html',
  styleUrl: './nuevo-paciente.css',
})
export class NuevoPaciente implements OnInit {
  nombre = '';
  apellidos = '';

  /** Objeto File correspondiente a la imagen seleccionada para el avatar */
  avatarFile: File | null = null;
  /** URL de vista previa base64 del avatar local antes de subirse */
  avatarPreview: string | null = null;

  maxDateNacimiento = '';
  minDateNacimiento = '';

  // 1. Añade el ID único al principio de la clase
  datetimeId = 'datetime-' + Math.random().toString(36).substring(2, 9);

  /** Objeto que almacena los diferentes campos de información personal y médica del paciente */
  paciente = {
    dni: '',
    fecha_nacimiento: '1990-01-01', // Fecha inicial para que el botón no esté vacío 
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

  /**
   * Crea una instancia del componente NuevoPaciente.
   *
   * @param {PacientesService} pacientesService - Servicio para registrar el paciente en base de datos.
   * @param {AuthService} authService - Servicio para interactuar con la sesión y usuario activo (el nutricionista).
   * @param {Router} router - Servicio de navegación de Angular.
   */
  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  /**
   * Método del ciclo de vida de Angular.
   * Configura las fechas máximas y mínimas para la fecha de nacimiento.
   */
  ngOnInit() {
    const hoy = new Date();
    const tzoffset = hoy.getTimezoneOffset() * 60000;
    
    this.maxDateNacimiento = new Date(Date.now() - tzoffset).toISOString().split('T')[0];

    const minDate = new Date();
    minDate.setFullYear(hoy.getFullYear() - 120);
    this.minDateNacimiento = new Date(minDate.getTime() - tzoffset).toISOString().split('T')[0];
  }

  /**
   * Maneja el evento de selección de un archivo desde el explorador de archivos local,
   * guardando el fichero en memoria y generando una vista previa en la variable `avatarPreview`.
   *
   * @param {*} event - Objeto del evento `change` del input de archivos.
   */
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

  /**
   * Valida el formulario localmente, procesa las alergias/intolerancias
   * y llama al servicio encargado de insertar tanto al usuario en autenticación
   * como el registro de paciente en base de datos y Cloudinary.
   *
   * @returns {Promise<void>}
   */
  async guardar() {
    if (
      !this.nombre ||
      !this.apellidos ||
      !this.paciente.dni ||
      !this.paciente.fecha_nacimiento ||
      !this.paciente.sexo ||
      !this.paciente.telefono ||
      !this.paciente.email ||
      !this.paciente.direccion ||
      !this.paciente.motivo_consulta
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
      ? this.alergiasInput
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a)
      : [];
    this.paciente.intolerancias = this.intoleracionesInput
      ? this.intoleracionesInput
          .split(',')
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    const { data, error } = await this.pacientesService.crearPaciente(
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
      alert(`✅ Paciente añadido correctamente.\n\nComunícale que ya puede acceder a su portal con su email y que su contraseña temporal es su DNI: ${this.paciente.dni.trim().toUpperCase()}`);
      this.router.navigate(['/pacientes']);
    }
  }
}