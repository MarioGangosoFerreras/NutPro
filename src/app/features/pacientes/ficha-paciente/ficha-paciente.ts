import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../core/services/pacientes';
import { FichaClinicaService } from '../../../core/services/ficha-clinica';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonAvatar,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonModal,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personCircleOutline,
  calendarOutline,
  callOutline,
  mailOutline,
  locationOutline,
  createOutline,
  closeOutline,
  saveOutline,
  cameraOutline,
  trashOutline,
  cardOutline,
  briefcaseOutline,
  heartOutline,
  flagOutline,
  addOutline,
  scaleOutline,
  bodyOutline,
  medkitOutline,
  restaurantOutline,
  checkmarkOutline,
  closeCircleOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-ficha-paciente',
  imports: [
    Header,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonAvatar,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonSegment,
    IonSegmentButton,
    IonToggle,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonModal,
  ],
  templateUrl: './ficha-paciente.html',
  styleUrl: './ficha-paciente.css',
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;
  tabActiva = 'resumen';
  menuAbierto = false;

  // Modo edición datos personales
  editando = false;
  guardando = false;
  form: any = {};
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  nuevaAlergia = '';
  nuevaIntolerancia = '';

  // Ficha clínica
  antFamiliares: any = null;
  antPersonales: any = null;
  encuesta: any = null;
  mediciones: any[] = [];
  loadingClinica = false;
  guardandoClinica = false;

  formAntFam: any = {};
  formAntPer: any = {};
  formEncuesta: any = {};

  // Nueva medición
  modalMedicion = false;
  nuevaMedicion: any = {
    fecha: new Date().toISOString().split('T')[0],
    peso_kg: null,
    altura_cm: null,
    grasa_corporal_pct: null,
    masa_muscular_kg: null,
    perimetro_cintura_cm: null,
    notas: '',
  };
  guardandoMedicion = false;

  cambiosClinica = false;
  cambiosAlimentacion = false;

  get hayCambiosSinGuardar(): boolean {
    return this.cambiosClinica || this.cambiosAlimentacion;
  }

  constructor(
    private pacientesService: PacientesService,
    private fichaClinicaService: FichaClinicaService,
    private cloudinaryService: CloudinaryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      arrowBackOutline,
      personCircleOutline,
      calendarOutline,
      callOutline,
      mailOutline,
      locationOutline,
      createOutline,
      closeOutline,
      saveOutline,
      cameraOutline,
      trashOutline,
      cardOutline,
      briefcaseOutline,
      heartOutline,
      flagOutline,
      addOutline,
      scaleOutline,
      bodyOutline,
      medkitOutline,
      restaurantOutline,
      checkmarkOutline,
      closeCircleOutline,
    });
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.cdr.detectChanges();
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }
    try {
      this.paciente = await this.pacientesService.getPacienteById(id);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async onTabChange(event: any) {
    this.tabActiva = event.detail.value;
    if (this.tabActiva === 'clinica' && !this.antFamiliares && !this.loadingClinica) {
      await this.cargarDatosClinica();
    }
    if (this.tabActiva === 'alimentacion' && !this.encuesta && !this.loadingClinica) {
      await this.cargarEncuesta();
    }
    if (this.tabActiva === 'mediciones' && this.mediciones.length === 0 && !this.loadingClinica) {
      await this.cargarMediciones();
    }
    this.cdr.detectChanges();
  }

  private async cargarDatosClinica() {
    this.loadingClinica = true;
    try {
      const [fam, per] = await Promise.all([
        this.fichaClinicaService.getAntecedentesFamiliares(this.paciente.id),
        this.fichaClinicaService.getAntecedentesPersonales(this.paciente.id),
      ]);
      this.antFamiliares = fam;
      this.antPersonales = per;
      this.formAntFam = fam
        ? { ...fam }
        : {
            hta: false,
            ecv: false,
            diabetes: false,
            enfermedad_autoinmune: false,
            alergias: false,
            obesidad: false,
            cancer: false,
            otra: '',
          };
      this.formAntPer = per
        ? { ...per }
        : {
            alcohol: false,
            tabaco: false,
            cirugias: false,
            alergias: false,
            enfermedad_patologia: '',
            medicacion: '',
            digestiones: '',
            menstruacion: '',
            suplementos_nutricionales: '',
            descansa_bien: false,
            actividad_fisica: null,
          };
    } catch (e) {
      console.error(e);
    } finally {
      this.loadingClinica = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarEncuesta() {
    this.loadingClinica = true;
    try {
      const enc = await this.fichaClinicaService.getEncuestaAlimentaria(this.paciente.id);
      this.encuesta = enc;
      this.formEncuesta = enc
        ? { ...enc }
        : {
            come_en_casa: null,
            hace_la_comida: null,
            le_gusta_cocinar: null,
            come_solo_tv: '',
            num_comidas_dia: null,
            come_tranquilo: null,
            ansiedad_comida: '',
            apetito: '',
            picotea: null,
            consumo_agua_litros: null,
            otras_bebidas: '',
            preferencias_alimentarias: '',
            aversiones_alimentarias: '',
          };
    } catch (e) {
      console.error(e);
    } finally {
      this.loadingClinica = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarMediciones() {
    this.loadingClinica = true;
    try {
      this.mediciones = await this.fichaClinicaService.getMediciones(this.paciente.id);
    } catch (e) {
      console.error(e);
    } finally {
      this.loadingClinica = false;
      this.cdr.detectChanges();
    }
  }

  marcarCambiosClinica() {
    this.cambiosClinica = true;
  }

  marcarCambiosAlimentacion() {
    this.cambiosAlimentacion = true;
  }

  async guardarTabActual() {
    const promesas = [];
    if (this.cambiosClinica) promesas.push(this.guardarClinica());
    if (this.cambiosAlimentacion) promesas.push(this.guardarEncuesta());
    await Promise.all(promesas);
  }

  async guardarClinica() {
    this.guardandoClinica = true;
    try {
      await Promise.all([
        this.fichaClinicaService.upsertAntecedentesFamiliares(this.paciente.id, this.formAntFam),
        this.fichaClinicaService.upsertAntecedentesPersonales(this.paciente.id, this.formAntPer),
      ]);
      this.cambiosClinica = false;
      await this.mostrarToast('Antecedentes guardados', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar', 'danger');
    } finally {
      this.guardandoClinica = false;
      this.cdr.detectChanges();
    }
  }

  async guardarEncuesta() {
    this.guardandoClinica = true;
    try {
      await this.fichaClinicaService.upsertEncuestaAlimentaria(this.paciente.id, this.formEncuesta);
      this.cambiosAlimentacion = false;
      await this.mostrarToast('Encuesta guardada', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar', 'danger');
    } finally {
      this.guardandoClinica = false;
      this.cdr.detectChanges();
    }
  }

  async guardarMedicion() {
    this.guardandoMedicion = true;
    try {
      await this.fichaClinicaService.addMedicion(this.paciente.id, this.nuevaMedicion);
      this.mediciones = await this.fichaClinicaService.getMediciones(this.paciente.id);
      this.modalMedicion = false;
      this.resetNuevaMedicion();
      await this.mostrarToast('Medición añadida', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar medición', 'danger');
    } finally {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
    }
  }

  async confirmarEliminarMedicion(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar medición',
      message: '¿Seguro que quieres eliminar esta medición?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: async () => {
            await this.fichaClinicaService.deleteMedicion(id);
            this.mediciones = this.mediciones.filter((m) => m.id !== id);
            this.cdr.detectChanges();
          },
        },
      ],
    });
    await alert.present();
  }

  private resetNuevaMedicion() {
    this.nuevaMedicion = {
      fecha: new Date().toISOString().split('T')[0],
      peso_kg: null,
      altura_cm: null,
      grasa_corporal_pct: null,
      masa_muscular_kg: null,
      perimetro_cintura_cm: null,
      notas: '',
    };
  }

  imcCategoria(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'warning' };
    if (imc < 25) return { label: 'Normopeso', color: 'success' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'warning' };
    return { label: 'Obesidad', color: 'danger' };
  }

  // ── Datos personales (igual que antes) ──
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  volver() {
    this.router.navigate(['/pacientes']);
  }

  iniciarEdicion() {
    this.form = {
      nombre: this.paciente.usuario?.nombre,
      apellidos: this.paciente.usuario?.apellidos,
      email: this.paciente.email,
      telefono: this.paciente.telefono,
      direccion: this.paciente.direccion,
      fecha_nacimiento: this.paciente.fecha_nacimiento,
      sexo: this.paciente.sexo,
      dni: this.paciente.dni,
      ocupacion: this.paciente.ocupacion,
      estado_civil: this.paciente.estado_civil,
      nacionalidad: this.paciente.nacionalidad,
      motivo_consulta: this.paciente.motivo_consulta,
      avatar_url: this.paciente.usuario?.avatar_url,
      alergias: [...(this.paciente.alergias || [])],
      intolerancias: [...(this.paciente.intolerancias || [])],
    };
    this.avatarPreview = null;
    this.avatarFile = null;
    this.editando = true;
    this.cdr.detectChanges();
  }

  cancelarEdicion() {
    this.editando = false;
    this.avatarPreview = null;
    this.avatarFile = null;
    this.cdr.detectChanges();
  }

  onAvatarChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  async guardar() {
    this.guardando = true;
    try {
      if (this.avatarFile) {
        const url = await this.cloudinaryService.uploadImage(this.avatarFile);
        if (url) this.form.avatar_url = url;
        else {
          await this.mostrarToast('Error al subir la imagen', 'danger');
          return;
        }
      }
      await this.pacientesService.actualizarPaciente(this.paciente.id, this.form);
      this.paciente.usuario.nombre = this.form.nombre;
      this.paciente.usuario.apellidos = this.form.apellidos;
      this.paciente.usuario.avatar_url = this.form.avatar_url;
      this.paciente.email = this.form.email;
      this.paciente.telefono = this.form.telefono;
      this.paciente.direccion = this.form.direccion;
      this.paciente.fecha_nacimiento = this.form.fecha_nacimiento;
      this.paciente.sexo = this.form.sexo;
      this.paciente.dni = this.form.dni;
      this.paciente.ocupacion = this.form.ocupacion;
      this.paciente.estado_civil = this.form.estado_civil;
      this.paciente.nacionalidad = this.form.nacionalidad;
      this.paciente.motivo_consulta = this.form.motivo_consulta;
      this.paciente.alergias = [...this.form.alergias];
      this.paciente.intolerancias = [...this.form.intolerancias];
      this.editando = false;
      this.avatarPreview = null;
      this.avatarFile = null;
      await this.mostrarToast('Paciente actualizado correctamente', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar los cambios', 'danger');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  agregarTag(tipo: 'alergias' | 'intolerancias', input: string) {
    const valor = input.trim();
    if (!valor || this.form[tipo].includes(valor)) return;
    this.form[tipo] = [...this.form[tipo], valor];
    if (tipo === 'alergias') this.nuevaAlergia = '';
    else this.nuevaIntolerancia = '';
    this.cdr.detectChanges();
  }

  eliminarTag(tipo: 'alergias' | 'intolerancias', index: number) {
    this.form[tipo] = this.form[tipo].filter((_: any, i: number) => i !== index);
    this.cdr.detectChanges();
  }

  onTagKeydown(event: KeyboardEvent, tipo: 'alergias' | 'intolerancias', valor: string) {
    if (event.key === 'Enter') this.agregarTag(tipo, valor);
  }

  async confirmarEliminar() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar paciente',
      message: `¿Seguro que quieres eliminar a "${this.paciente.usuario?.nombre} ${this.paciente.usuario?.apellidos}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => this.eliminar(),
        },
      ],
    });
    await alert.present();
  }

  private async eliminar() {
    try {
      await this.pacientesService.eliminarPaciente(this.paciente.id, this.paciente.usuario_id);
      await this.mostrarToast('Paciente eliminado correctamente', 'success');
      this.router.navigate(['/pacientes']);
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al eliminar el paciente', 'danger');
    }
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
