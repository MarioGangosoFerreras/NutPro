import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircleOutline, listOutline, calendarOutline } from 'ionicons/icons';
import { CitasService, Cita } from '../../../../../core/services/citas';
import { CitasLista } from './citas-lista/citas-lista';
import { ModalCitaComponent } from '../../../../../shared/components/modal-cita/modal-cita';
import { AuthService } from '../../../../../core/services/auth';
import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton,
  IonSpinner,
  ModalController,
  AlertController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { UniversalCalendar } from "../../../../../shared/components/universal-calendar/universal-calendar";
import { PdfService } from '../../../../../core/services/pdf';
import { SupabaseService } from '../../../../../core/services/supabase';
import { DocumentosService } from '../../../../../core/services/documentos';

/**
 * Componente responsable de la pestaña "Citas" en la ficha del paciente.
 * Permite cambiar entre una vista de lista o calendario y gestionar (crear, editar, borrar, facturar)
 * las citas asociadas exclusivamente a este paciente.
 *
 * @export
 * @class TabCitas
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-citas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonButton,
    CitasLista,
    UniversalCalendar
  ],
  templateUrl: './tab-citas.html',
})
export class TabCitas implements OnInit {
  /** Objeto completo con la información del paciente. */
  @Input() paciente: any;
  /** Identificador único del nutricionista vinculado a las citas. */
  @Input() nutricionistaId!: string;

  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private pdfService = inject(PdfService);
  private docsService = inject(DocumentosService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private supabase = inject(SupabaseService).client;

  /** Alterna entre los modos visuales de las citas ('lista' o 'calendario'). */
  vistaActiva: 'lista' | 'calendario' = 'lista';
  /** Lista local de citas obtenidas desde el servidor. */
  citas: Cita[] = [];
  /** Bandera indicadora del estado de carga inicial. */
  cargando = true;

  /**
   * Crea la instancia de TabCitas y registra los iconos usados.
   */
  constructor() {
    addIcons({ addCircleOutline, listOutline, calendarOutline });
  }

  /**
   * Inicializa la vista solicitando las citas correspondientes a este paciente.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarCitas();
  }

  /**
   * Manejador de eventos al cambiar entre la vista de calendario o la vista de lista.
   *
   * @param {*} e - Objeto del evento `ionChange` de `ion-segment`.
   */
  onVistaChange(e: any) {
    this.vistaActiva = e.detail.value;
    this.cdr.markForCheck();
  }

  /**
   * Obtiene la lista de citas filtradas por el paciente actual a través del servicio,
   * y fuerza una actualización de detección de cambios (debido al OnPush).
   *
   * @returns {Promise<void>}
   */
  async cargarCitas() {
    this.ngZone.run(async () => {
      this.cargando = true;
      this.cdr.markForCheck();
      try {
        const datos = await this.citasService.getCitasPaciente(
          this.paciente.id, // Actualizado para usar el id del objeto paciente
          this.nutricionistaId,
        );
        this.citas = [...datos];
      } finally {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Abre el modal de creación/edición de una cita.
   *
   * @param {(Cita | string)} [dato] - Si es de tipo Cita es una edición, si es string es una fecha inicial preseleccionada, si es undefined es creación vacía.
   * @returns {Promise<void>}
   */
  async abrirModal(dato?: Cita | string) {
    // Comprobamos si el dato es un objeto Cita o un string de fecha
    const esCita = dato && typeof dato === 'object';
    const fechaInput = typeof dato === 'string' ? dato : undefined;

    const modal = await this.modalCtrl.create({
      component: ModalCitaComponent,
      componentProps: {
        cita: esCita ? dato : undefined,
        fechaSeleccionada: fechaInput, // Pasamos la fecha detectada
        pacienteId: this.paciente.id,
        nutricionistaId: this.nutricionistaId,
      },
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'guardado') {
      await this.cargarCitas();
    }
  }

  /**
   * Actualiza el estado de una cita pendiente a "confirmada".
   *
   * @param {Cita} cita - Objeto de la cita a confirmar.
   * @returns {Promise<void>}
   */
  async confirmar(cita: Cita) {
    await this.citasService.confirmarCita(cita.id!);
    await this.cargarCitas();
  }

  /**
   * Muestra un cuadro de confirmación para cancelar una cita. 
   * Si se acepta, actualiza el estado a "cancelada" en base de datos.
   *
   * @param {Cita} cita - Objeto de la cita a cancelar.
   * @returns {Promise<void>}
   */
  async cancelar(cita: Cita) {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar cita',
      message: '¿Seguro que quieres cancelar esta cita?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí',
          role: 'confirm',
          handler: async () => {
            const usuarioId = await this.authService.getUsuarioId();
            await this.citasService.cancelarCita(cita.id!, usuarioId);
            await this.cargarCitas();
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Muestra un cuadro de diálogo destructivo para eliminar definitivamente una cita.
   * Tras la confirmación, se borra el registro permanentemente.
   *
   * @param {Cita} cita - Objeto de la cita a eliminar.
   * @returns {Promise<void>}
   */
  async eliminar(cita: Cita) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cita',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.citasService.eliminarCita(cita.id!);
            await this.cargarCitas();
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Despliega un cuadro de diálogo para solicitar el importe correspondiente y,
   * de ser confirmado, inicia el proceso de generación de la factura.
   *
   * @param {Cita} cita - La cita que está lista para ser facturada.
   * @returns {Promise<void>}
   */
  async crearFactura(cita: Cita) {
    const alert = await this.alertCtrl.create({
      header: 'Generar Factura',
      subHeader: `Cita: ${cita.tipo}`,
      message: 'Introduce el importe total de la consulta (IVA incl.):',
      inputs: [
        {
          name: 'importe',
          type: 'number',
          placeholder: 'Ej: 50',
          value: cita.tipo === 'presencial' ? '60' : '45'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Generar PDF',
          handler: (data) => {
            this.procesarGeneracionFactura(cita, parseFloat(data.importe));
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Genera el PDF de la factura, la sube al bucket de almacenamiento, actualiza el estado
   * de la cita a "facturada" y avisa al usuario mediante un Toast.
   *
   * @private
   * @param {Cita} cita - La cita asociada a la factura.
   * @param {number} importe - El importe introducido manualmente.
   * @returns {Promise<void>}
   */
  private async procesarGeneracionFactura(cita: Cita, importe: number) {
    if (isNaN(importe) || importe <= 0) return;

    const loading = await this.loadingCtrl.create({ message: 'Generando factura...' });
    await loading.present();

    try {
      const { data: nutriData } = await this.supabase
        .from('nutricionistas')
        .select('*, usuario:usuario_id(*)')
        .eq('usuario_id', await this.authService.getUsuarioId())
        .single();

      const emisor = {
        ...nutriData.usuario,
        dni_fiscal: nutriData.dni_fiscal,
        direccion_fiscal: nutriData.direccion_fiscal
      };

      const pdfBlob = await this.pdfService.generarFacturaPdfBlob(cita, this.paciente, emisor, importe);
      const fecha = new Date(cita.fecha_hora).toLocaleDateString().replace(/\//g, '-');
      const fileName = `Factura_${this.paciente.usuario.nombre}_${fecha}.pdf`;

      // 1. Subir el documento
      await this.docsService.subirDocumento(this.paciente.id, pdfBlob, fileName, 'factura', importe, cita.id);
      
      // 2. CRÍTICO: Actualizar la tabla de citas en la DB verificando si hay errores
      const { error: updateError } = await this.supabase
        .from('citas')
        .update({ facturada: true })
        .eq('id', cita.id);

      if (updateError) {
        throw new Error('Fallo en BD: ' + updateError.message);
      }

      // 3. Mutación de estado local inmediata
      cita.facturada = true;

      // 4. Recargar base de datos local
      await this.cargarCitas();

      await loading.dismiss();
      const successToast = await this.toastCtrl.create({
        message: 'Factura generada y cita actualizada.',
        duration: 3000,
        color: 'success'
      });
      successToast.present();

      this.cdr.detectChanges(); // Fuerza a Angular a pintar el cambio
    } catch (e) {
      await loading.dismiss();
      console.error(e);
      const errToast = await this.toastCtrl.create({
        message: 'Error al actualizar el estado de la cita.',
        duration: 3000,
        color: 'danger'
      });
      errToast.present();
    }
  }
}