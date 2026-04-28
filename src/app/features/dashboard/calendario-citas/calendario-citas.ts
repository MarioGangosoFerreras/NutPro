import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { IonContent, AlertController, LoadingController, ToastController } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular/standalone';
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";
import { Shell } from '../../../shared/components/shell/shell';
import { Header } from "../../../shared/components/header/header";

// Importaciones para facturación
import { Cita } from '../../../core/services/citas';
import { PdfService } from '../../../core/services/pdf';
import { DocumentosService } from '../../../core/services/documentos';
import { SupabaseService } from '../../../core/services/supabase';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-calendario-citas',
  standalone: true,
  imports: [IonContent, UniversalCalendar, Header],
  templateUrl: './calendario-citas.html',
})
export class CalendarioCitas implements OnInit {
  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);

  // Inyecciones de servicios para generar facturas
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private pdfService = inject(PdfService);
  private docsService = inject(DocumentosService);
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  cargandoPagina = signal(true); // Signal de carga global

  ngOnInit(): void {
    // Simulamos un tiempo mínimo para que la transición sea fluida
    setTimeout(() => {
      this.cargandoPagina.set(false);
      this.cdr.detectChanges();
    }, 800);
  }

  get collapsed() {
    return Shell.isCollapsed();
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }

  // ─── NUEVOS MÉTODOS PARA FACTURAR DESDE EL CALENDARIO ───

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

  private async procesarGeneracionFactura(cita: Cita, importe: number) {
    if (isNaN(importe) || importe <= 0) return;

    const loading = await this.loadingCtrl.create({ message: 'Generando y guardando factura...' });
    await loading.present();

    try {
      // 1. Obtener datos del nutricionista (emisor)
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

      // 2. Obtener los datos completos del paciente
      const { data: pacienteData } = await this.supabase
        .from('pacientes')
        .select('*, usuario:usuario_id(*)')
        .eq('id', cita.paciente_id)
        .single();

      // 3. Generar PDF
      const pdfBlob = await this.pdfService.generarFacturaPdfBlob(cita, pacienteData, emisor, importe);

      const fecha = new Date(cita.fecha_hora).toLocaleDateString().replace(/\//g, '-');
      const fileName = `Factura_${pacienteData.usuario.nombre}_${fecha}.pdf`;

      // 4. Subir a documentos del paciente
      await this.docsService.subirDocumento(
        cita.paciente_id,
        pdfBlob,
        fileName,
        'factura',
        importe
      );

      // 5. ACTUALIZAR ESTADO DE LA CITA a facturada
      await this.supabase.from('citas').update({ facturada: true }).eq('id', cita.id);

      // Mutamos localmente para que se quite el badge rojo del calendario automáticamente
      cita.facturada = true;

      await loading.dismiss();
      const successToast = await this.toastCtrl.create({
        message: 'Factura generada con éxito.',
        duration: 3000,
        color: 'success'
      });
      successToast.present();

      this.cdr.detectChanges(); // Refrescamos el calendario

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