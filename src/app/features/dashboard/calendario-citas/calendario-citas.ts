import { ChangeDetectorRef, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { IonContent, AlertController, LoadingController, ToastController } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular/standalone';
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";
import { Shell } from '../../../shared/components/shell/shell';
import { Header } from "../../../shared/components/header/header";

import { Cita } from '../../../core/services/citas';
import { PdfService } from '../../../core/services/pdf';
import { DocumentosService } from '../../../core/services/documentos';
import { SupabaseService } from '../../../core/services/supabase';
import { AuthService } from '../../../core/services/auth';

/**
 * Componente que muestra la vista principal de la agenda de citas del nutricionista,
 * integrando el componente UniversalCalendar y permitiendo la facturación directa de citas.
 *
 * @export
 * @class CalendarioCitas
 * @implements {OnInit}
 */
@Component({
  selector: 'app-calendario-citas',
  standalone: true,
  imports: [IonContent, UniversalCalendar, Header],
  templateUrl: './calendario-citas.html',
})
export class CalendarioCitas implements OnInit {
  // Añadimos el ViewChild para acceder al calendario
  /**
   * Referencia al componente hijo UniversalCalendar para poder interactuar con él (ej. recargar el mes).
   * @type {UniversalCalendar}
   */
  @ViewChild(UniversalCalendar) calendarComponent!: UniversalCalendar;

  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private pdfService = inject(PdfService);
  private docsService = inject(DocumentosService);
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Señal reactiva que indica si la página está cargando inicialmente.
   * @type {import('@angular/core').WritableSignal<boolean>}
   */
  cargandoPagina = signal(true);

  /**
   * Método del ciclo de vida de Angular. Se ejecuta al inicializar el componente.
   * Simula un tiempo de carga inicial antes de mostrar el calendario completo.
   */
  ngOnInit(): void {
    setTimeout(() => {
      this.cargandoPagina.set(false);
      this.cdr.detectChanges();
    }, 800);
  }

  /**
   * Obtiene el estado del menú lateral desde el componente Shell.
   *
   * @readonly
   * @type {boolean}
   */
  get collapsed() {
    return Shell.isCollapsed();
  }

  /**
   * Alterna la visibilidad del menú lateral (colapsado o expandido) dependiendo del ancho de la pantalla.
   */
  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  /**
   * Inicia el proceso de facturación de una cita abriendo un cuadro de diálogo
   * para confirmar el importe antes de generar el PDF.
   *
   * @param {Cita} cita - Objeto que contiene los detalles de la cita a facturar.
   * @returns {Promise<void>}
   */
  async generarFacturaDesdeCalendario(cita: Cita) {
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
   * Procesa la generación de la factura: crea el PDF, lo sube al almacenamiento,
   * actualiza la base de datos para marcar la cita como facturada y refresca el calendario local.
   *
   * @private
   * @param {Cita} cita - La cita que se va a facturar.
   * @param {number} importe - El importe total a facturar.
   * @returns {Promise<void>}
   */
  private async procesarGeneracionFactura(cita: Cita, importe: number) {
    if (isNaN(importe) || importe <= 0) return;

    const loading = await this.loadingCtrl.create({ message: 'Generando y guardando factura...' });
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

      const { data: pacienteData } = await this.supabase
        .from('pacientes')
        .select('*, usuario:usuario_id(*)')
        .eq('id', cita.paciente_id)
        .single();

      const pdfBlob = await this.pdfService.generarFacturaPdfBlob(cita, pacienteData, emisor, importe);
      const fecha = new Date(cita.fecha_hora).toLocaleDateString().replace(/\//g, '-');
      const fileName = `Factura_${pacienteData.usuario.nombre}_${fecha}.pdf`;

      // 1. Subir a documentos del paciente
      await this.docsService.subirDocumento(
        cita.paciente_id,
        pdfBlob,
        fileName,
        'factura',
        importe
      );

      // 2. ACTUALIZAR ESTADO DE LA CITA y comprobar si hay error
      const { error: updateError } = await this.supabase
        .from('citas')
        .update({ facturada: true })
        .eq('id', cita.id);

      if (updateError) {
        throw new Error('Fallo en BD: ' + updateError.message);
      }

      // 3. Mutación local para agilizar la UI
      cita.facturada = true;

      // 4. Refrescar el calendario (el ViewChild que añadimos en la respuesta anterior)
      if (this.calendarComponent) {
        await this.calendarComponent.cargarMes();
      }

      await loading.dismiss();
      const successToast = await this.toastCtrl.create({
        message: 'Factura generada con éxito.',
        duration: 3000,
        color: 'success'
      });
      successToast.present();

      this.cdr.detectChanges();

    } catch (e) {
      await loading.dismiss();
      console.error(e);
      const errToast = await this.toastCtrl.create({
        message: 'Error al generar la factura.',
        duration: 3000,
        color: 'danger'
      });
      errToast.present();
    }
  }
}