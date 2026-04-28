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
  // Cambio principal: ahora recibimos el objeto 'paciente' completo
  @Input() paciente: any;
  @Input() nutricionistaId!: string;

  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private pdfService = inject(PdfService);
  private docsService = inject(DocumentosService);

  // Inyecciones que faltaban para generar la factura
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private supabase = inject(SupabaseService).client;

  vistaActiva: 'lista' | 'calendario' = 'lista';
  citas: Cita[] = [];
  cargando = true;

  constructor() {
    addIcons({ addCircleOutline, listOutline, calendarOutline });
  }

  async ngOnInit() {
    await this.cargarCitas();
  }

  onVistaChange(e: any) {
    this.vistaActiva = e.detail.value;
    this.cdr.markForCheck();
  }

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

  async abrirModal(cita?: Cita) {
    const modal = await this.modalCtrl.create({
      component: ModalCitaComponent,
      componentProps: {
        cita,
        pacienteId: this.paciente.id, // Actualizado para usar el id del objeto paciente
        nutricionistaId: this.nutricionistaId,
      },
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'guardado') {
      await this.cargarCitas();
    }
  }

  async confirmar(cita: Cita) {
    await this.citasService.confirmarCita(cita.id!);
    await this.cargarCitas();
  }

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

      await this.docsService.subirDocumento(
        this.paciente.id,
        pdfBlob,
        fileName,
        'factura',
        importe
      );
      await loading.dismiss();
      const successToast = await this.toastCtrl.create({
        message: 'Factura guardada en la sección de Documentos',
        duration: 3000,
        color: 'success'
      });
      successToast.present();

    } catch (e) {
      await loading.dismiss();
      console.error(e);
    }
  }
}