import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewEncapsulation,
  inject,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { FichaClinicaService } from '../../../core/services/ficha-clinica';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { Header } from '../../../shared/components/header/header';
import { TabResumen } from './tabs/tab-resumen/tab-resumen';
import { TabClinica } from './tabs/tab-clinica/tab-clinica';
import { TabAlimentacion } from './tabs/tab-alimentacion/tab-alimentacion';
import { TabMediciones } from './tabs/tab-mediciones/tab-mediciones';
import { TabPlan } from './tabs/tab-plan/tab-plan';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ToastController,
  AlertController,
  IonCard,
  IonCardContent,
  IonAvatar,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { TabCitas } from './tabs/tab-citas/tab-citas';
import { SupabaseService } from '../../../core/services/supabase';
import {
  arrowBackOutline,
  personCircleOutline,
  medkitOutline,
  restaurantOutline,
  scaleOutline,
  createOutline,
  trashOutline,
  calendarOutline,
  nutritionOutline,
  chatbubblesOutline,
  documentAttachOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { TabDocumentos } from "./tabs/tab-documentos/tab-documentos";

/**
 * Componente central y de mayor jerarquía al interactuar con un solo paciente.
 * Aloja toda la ficha del paciente separada por pestañas (resumen, clínica, alimentación,
 * mediciones, planes, citas, facturas).
 *
 * @export
 * @class FichaPaciente
 * @implements {OnInit}
 */
@Component({
  selector: 'app-ficha-paciente',
  imports: [
    Header,
    TabResumen,
    TabClinica,
    TabAlimentacion,
    TabMediciones,
    TabPlan,
    TabCitas,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonAvatar,
    IonItem,
    RouterLink,
    TabDocumentos
],
  templateUrl: './ficha-paciente.html',
  styleUrls: ['./ficha-paciente.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;
  tabActiva = 'resumen';
  
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;
  
  /** Referencia del componente hijo (Resumen) para disparar funciones (ej. editar desde aquí) */
  @ViewChild(TabResumen) tabResumen!: TabResumen;

  menuAbierto = false;

  /** Alterna la visibilidad del menú de acciones superior. */
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  /**
   * Crea una instancia de FichaPaciente e inicializa sus iconos.
   *
   * @param {PacientesService} pacientesService - Servicio de pacientes.
   * @param {FichaClinicaService} fichaClinicaService - Servicio principal de fichas clínicas y mediciones.
   * @param {CloudinaryService} cloudinaryService - Servicio para gestión de imágenes.
   * @param {ActivatedRoute} route - Route parameter helper.
   * @param {Router} router - Angular router.
   * @param {ChangeDetectorRef} cdr - Herramienta para reflejar los cambios en el DOM.
   * @param {ToastController} toastCtrl - Para notificaciones.
   * @param {AlertController} alertCtrl - Para alertas de confirmación.
   */
  constructor(
    private pacientesService: PacientesService,
    public fichaClinicaService: FichaClinicaService,
    public cloudinaryService: CloudinaryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
  ) {
    addIcons({
      arrowBackOutline,
      personCircleOutline,
      medkitOutline,
      restaurantOutline,
      scaleOutline,
      createOutline,
      trashOutline,
      nutritionOutline,
      calendarOutline,
      chatbubblesOutline,
      documentAttachOutline
    });
  }

  /**
   * Al iniciar el componente, lee el ID del paciente proveniente en la URL,
   * y efectúa la descarga inicial de toda la información básica requerida.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }

    try {
      this.loading = true; // Asegurarnos de que empiece en true

      // Promise.all para garantizar que el aguacate se vea un poco
      const [data] = await Promise.all([
        this.pacientesService.getPacienteById(id),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      this.paciente = data;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Fuerza al componente `tab-resumen` interno a entrar en modo edición
   * si el usuario lo ordena desde el menú desplegable rápido.
   */
  editarDesdeMenu() {
    this.menuAbierto = false;
    this.tabActiva = 'resumen'; // Cambiamos a la pestaña de resumen por si acaso
    setTimeout(() => {
      this.tabResumen.iniciarEdicion(); // Ejecutamos la edición en el hijo
    }, 100);
  }

  /**
   * Responde a los clics en el segmento superior y renderiza dinámicamente
   * la pestaña (`app-tab-*`) que el usuario haya seleccionado.
   *
   * @param {*} event - Objeto del evento `ionChange` de `ion-segment`.
   */
  onTabChange(event: any) {
    this.tabActiva = event.detail.value;
    this.cdr.detectChanges();
  }

  /** Navega de regreso al listado general de pacientes. */
  volver() {
    this.router.navigate(['/pacientes']);
  }

  /**
   * Refleja los cambios localmente en la ficha después de una edición
   * exitosa en el componente hijo `TabResumen`.
   *
   * @param {*} pacienteActualizado - El nuevo objeto con la información modificada.
   */
  onPacienteActualizado(pacienteActualizado: any) {
    this.paciente = pacienteActualizado;
    this.cdr.detectChanges();
  }

  /**
   * Pide una doble confirmación al nutricionista antes de ejecutar el borrado permanente del paciente.
   *
   * @returns {Promise<void>}
   */
  async onEliminarPaciente() {
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

  /**
   * Llama a base de datos para destruir al paciente y lo redirige a la lista general.
   *
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * Crea un Toast semántico con el aviso del estado en el componente actual.
   *
   * @param {string} mensaje - El aviso en sí.
   * @param {string} color - El color de la UI Ionic (`primary`, `success`, `danger`, `warning`).
   */
  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // 1. Obtener o crear el menú base para un plan
  /**
   * Consulta a base de datos el menú semanal vinculado a un plan y paciente específico.
   * Si no existe uno, genera el registro primario por defecto.
   *
   * @param {string} planId - ID del plan nutricional base.
   * @param {string} pacienteId - UUID de Supabase del paciente en BD.
   * @returns {Promise<any>}
   */
  async getOrCreateMenuParaPlan(planId: string, pacienteId: string) {
    // Buscar si ya existe un menú para este plan
    let { data: menu, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;

    // Si no existe, lo creamos
    if (!menu) {
      const nutricionistaId = await this.authService.getNutricionistaId();
      const { data: nuevoMenu, error: insertError } = await this.supabase
        .from('menus_semanales')
        .insert({
          plan_id: planId,
          paciente_id: pacienteId,
          nutricionista_id: nutricionistaId,
          semana_inicio: new Date().toISOString().split('T')[0],
          titulo: 'Menú Semanal del Plan',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      menu = nuevoMenu;
    }

    return menu;
  }

  // 2. Obtener las recetas guardadas en el menú
  /**
   * Descarga la lista de registros de "entradas", es decir, todas las recetas asignadas
   * a cada día y cada hora de comida en un determinado menú semanal.
   *
   * @param {string} menuId - El id relacional a la tabla menús_semanales.
   * @returns {Promise<any[]>}
   */
  async getEntradasMenu(menuId: string) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      // CORRECCIÓN AQUÍ: Usamos 'nombre' en lugar de 'titulo'
      .select('*, receta:recetas(id, nombre)')
      .eq('menu_id', menuId);

    if (error) throw error;
    return data || [];
  }

  // 3. Añadir una receta a un día/comida
  /**
   * Incorpora un nuevo plato/receta al menú indicando el día de la semana y si es comida, cena, etc.
   *
   * @param {*} entrada - Un payload tipado conteniendo `menu_id`, `receta_id`, `dia_semana`, `tipo_comida`, etc.
   * @returns {Promise<any>}
   */
  async addEntradaMenu(entrada: any) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .insert(entrada)
      // CORRECCIÓN AQUÍ: Usamos 'nombre' en lugar de 'titulo'
      .select('*, receta:recetas(id, nombre)')
      .single();

    if (error) throw error;
    return data;
  }

  // 4. Eliminar una receta del menú
  /**
   * Elimina un plato/receta de la matriz del menú semanal utilizando su ID directo.
   *
   * @param {string} id - Id base de la entrada a limpiar.
   * @returns {Promise<void>}
   */
  async deleteEntradaMenu(id: string) {
    const { error } = await this.supabase.from('menu_entradas').delete().eq('id', id);

    if (error) throw error;
  }
}