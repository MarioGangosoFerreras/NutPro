import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PacientesService } from '../../../../../core/services/pacientes';
import { CloudinaryService } from '../../../../../core/services/cloudinary';
import {
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
  ToastController,
  AlertController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonCol,
  IonGrid,
  IonRow,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
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
  closeCircle,
} from 'ionicons/icons';

/**
 * Componente "Dashboard" del paciente que recopila, expone a la vista,
 * y en su contraparte condicional edita los parámetros biográficos, foto de perfil (avatar),
 * de contacto y médicos (Alergias) más directos.
 *
 * @export
 * @class TabResumen
 */
@Component({
  selector: 'app-tab-resumen',
  imports: [
    FormsModule,
    IonIcon,
    IonItem,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonCol,
    IonGrid,
    IonRow,
    IonSpinner,
    IonButton,
    IonSelectOption,
    IonAvatar, 
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
    IonAvatar
],
  templateUrl: './tab-resumen.html',
  styleUrl: './tab-resumen.css',
})
export class TabResumen {
  /** Estructura central devuelta por GET id. */
  @Input() paciente: any;
  /** Actualizador inyectado emitible tras POST al padre FichaPaciente que fuerza refresco Reactivo. */
  @Output() pacienteActualizado = new EventEmitter<any>();
  /** Informa intencion de borrado permanente. */
  @Output() eliminarPaciente = new EventEmitter<void>();

  editando = false;
  guardando = false;
  menuAbierto = false;
  form: any = {};
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  nuevaAlergia = '';
  nuevaIntolerancia = '';

  /**
   * Crea una instancia del tab-resumen.
   *
   * @param {PacientesService} pacientesService - Control CRUD BD.
   * @param {CloudinaryService} cloudinaryService - Subidor para Blob Img Files de Avatar Upload con API.
   * @param {ChangeDetectorRef} cdr - Angular CD.
   * @param {ToastController} toastCtrl - Para notificar el completado asincrono exitoso en pantalla.
   */
  constructor(
    private pacientesService: PacientesService,
    private cloudinaryService: CloudinaryService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      personCircleOutline, calendarOutline, callOutline, mailOutline,
      locationOutline, createOutline, closeOutline, saveOutline,
      cameraOutline, trashOutline, cardOutline, briefcaseOutline,
      heartOutline, flagOutline, addOutline, closeCircle
    });
  }

  /**
   * Herramienta visual directa aritmética computada sobre fechas ISO 8601.
   *
   * @param {string} fechaNacimiento - Dato String AAAA-MM-DD.
   * @returns {number} Valor Entero en Años edad.
   */
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  /** Presenta un helper booleano invertido en ionic html toggleado con CDR. */
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    this.cdr.detectChanges();
  }

  /**
   * Población inicial local, tras pulsar boton en "Modificar / Edit".
   * Rescata y copia todos los valores de `@Input` a unas variables reactivas propias llamadas form.
   */
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
    this.editando = true;
    this.cdr.detectChanges();
  }

  /** Cierra abruptamente vaciando toda previsualización local o foto insertada. */
  cancelarEdicion() {
    this.editando = false;
    this.avatarPreview = null;
    this.avatarFile = null;
    this.cdr.detectChanges();
  }

  /**
   * Evento FileReader nativo extraído al seleccionar el popup de selector File de Sistema OS
   * para procesar una visualización instantanea HTML local a través del Data URL.
   *
   * @param {*} event - Change event con File array.
   */
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

  /**
   * Actualiza el modelo remoto de BD mandando como primer paso Cloudinary File si aplica,
   * y después a través del endpoint base UPDATE todas las variables sobreescritas del user y la tabla.
   * Tras finalizar, emite un re-construcción JSON (sin llamar HTTP Get) hacia su padre directo para repintar UI rápido.
   *
   * @returns {Promise<void>}
   */
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

      const pacienteActualizado = {
        ...this.paciente,
        usuario: {
          ...this.paciente.usuario,
          nombre: this.form.nombre,
          apellidos: this.form.apellidos,
          avatar_url: this.form.avatar_url,
        },
        email: this.form.email,
        telefono: this.form.telefono,
        direccion: this.form.direccion,
        fecha_nacimiento: this.form.fecha_nacimiento,
        sexo: this.form.sexo,
        dni: this.form.dni,
        ocupacion: this.form.ocupacion,
        estado_civil: this.form.estado_civil,
        nacionalidad: this.form.nacionalidad,
        motivo_consulta: this.form.motivo_consulta,
        alergias: [...this.form.alergias],
        intolerancias: [...this.form.intolerancias],
      };

      this.pacienteActualizado.emit(pacienteActualizado);
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

  /**
   * Operador local HTML iterador push string genérico; no permite subidas de strings dobles duplicados o nulos ("").
   *
   * @param {('alergias' | 'intolerancias')} tipo - Propiedad target local array strings form.
   * @param {string} input - Valor string real escrito.
   */
  agregarTag(tipo: 'alergias' | 'intolerancias', input: string) {
    const valor = input.trim();
    if (!valor || this.form[tipo].includes(valor)) return;
    this.form[tipo] = [...this.form[tipo], valor];
    if (tipo === 'alergias') this.nuevaAlergia = '';
    else this.nuevaIntolerancia = '';
    this.cdr.detectChanges();
  }

  /**
   * Local array slice para un string del input extraído a partir de índice nativo del *ngFor.
   *
   * @param {('alergias' | 'intolerancias')} tipo - Input base target a manipular.
   * @param {number} index - Referencia inidice HTML en array para borrar.
   */
  eliminarTag(tipo: 'alergias' | 'intolerancias', index: number) {
    this.form[tipo] = this.form[tipo].filter((_: any, i: number) => i !== index);
    this.cdr.detectChanges();
  }

  /**
   * Escucha keypress eventos para automatizar en UI un tag-push sin clicks explicitos sobre su boton (+) solo usando salto de línea Enter.
   *
   * @param {KeyboardEvent} event - Interaccion hardware raton nativa de key HTML.
   * @param {('alergias' | 'intolerancias')} tipo - Propiedad target form local.
   * @param {string} valor - Valor base value a trasladar al push de array.
   */
  onTagKeydown(event: KeyboardEvent, tipo: 'alergias' | 'intolerancias', valor: string) {
    if (event.key === 'Enter') this.agregarTag(tipo, valor);
  }

  /**
   * Helper unificador y automatizador privado para desplegar componentes asíncronos en capa Toast.
   *
   * @private
   * @param {string} mensaje - El texto informativo de UX app.
   * @param {string} color - El theme tipográfico para la maquetación.
   * @returns {Promise<void>}
   */
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