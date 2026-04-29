import { Component, ChangeDetectorRef, signal, inject, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonIcon, IonBadge,
  AlertController, LoadingController, ToastController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Header } from "../../../shared/components/header/header";
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";
import { EstadisticasDashboardComponent } from '../estadisticas-dashboard/estadisticas-dashboard';
import { ListaPacientesPreviewComponent } from "../lista-pacientes-preview/lista-pacientes-preview";
import { CitasService, Cita } from '../../../core/services/citas';
import { PdfService } from '../../../core/services/pdf';
import { DocumentosService } from '../../../core/services/documentos';
import { SupabaseService } from '../../../core/services/supabase';
import { addIcons } from 'ionicons';
import { cashOutline, receiptOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, IonContent, IonButton, Header, UniversalCalendar,
    EstadisticasDashboardComponent, ListaPacientesPreviewComponent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonIcon, IonBadge
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements ViewWillEnter {

  @ViewChild(EstadisticasDashboardComponent) statsWidget!: EstadisticasDashboardComponent;
  @ViewChild(UniversalCalendar) calendarWidget!: UniversalCalendar;

  nombreUsuario = '';
  cargandoPagina = signal(true);
  citasPendientes = signal<Cita[]>([]); // <--- NUEVA SEÑAL

  private citasService = inject(CitasService);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private pdfService = inject(PdfService);
  private docsService = inject(DocumentosService);
  private supabase = inject(SupabaseService).client;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ cashOutline, receiptOutline });
  }

  async ionViewWillEnter() {
    await this.cargarUsuario(); // Carga las facturas pendientes

    // Si los componentes ya existen en la vista, los recargamos
    if (this.statsWidget) {
      this.statsWidget.cargarStats();
    }
    if (this.calendarWidget) {
      this.calendarWidget.cargarMes();
    }
  }

  private async cargarUsuario() {
    try {
      const usuario = await this.authService.getUsuario();
      const nutricionistaId = await this.authService.getNutricionistaId();

      if (nutricionistaId) {
        const pendientes = await this.citasService.getCitasPendientesFacturar(nutricionistaId);
        this.citasPendientes.set(pendientes);
      }

      setTimeout(() => {
        this.cargandoPagina.set(false);
        this.cdr.detectChanges();
      }, 1000);

    } catch (error) {
      console.error(error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }

  // 👇 Lógica para facturar directamente desde el dashboard 👇
  async facturarCita(cita: Cita) {
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
      const nutriId = await this.authService.getUsuarioId();
      // Datos del emisor
      const { data: nutriData } = await this.supabase
        .from('nutricionistas')
        .select('*, usuario:usuario_id(*)')
        .eq('usuario_id', nutriId)
        .single();

      const emisor = {
        ...nutriData.usuario,
        dni_fiscal: nutriData.dni_fiscal,
        direccion_fiscal: nutriData.direccion_fiscal
      };

      // Datos del paciente completos para la factura
      const { data: fullPaciente } = await this.supabase
        .from('pacientes')
        .select('*, usuario:usuario_id(*)')
        .eq('id', cita.paciente_id)
        .single();

      const pdfBlob = await this.pdfService.generarFacturaPdfBlob(cita, fullPaciente, emisor, importe);
      const fecha = new Date(cita.fecha_hora).toLocaleDateString().replace(/\//g, '-');
      const fileName = `Factura_${fullPaciente.usuario.nombre}_${fecha}.pdf`;

      await this.docsService.subirDocumento(cita.paciente_id, pdfBlob, fileName, 'factura', importe, cita.id);

      const { error: updateError } = await this.supabase
        .from('citas')
        .update({ facturada: true })
        .eq('id', cita.id);

      if (updateError) throw updateError;

      // Actualizamos la lista local eliminando la que acabamos de facturar (efecto inmediato)
      this.citasPendientes.update(citas => citas.filter(c => c.id !== cita.id));

      await loading.dismiss();
      const successToast = await this.toastCtrl.create({ message: 'Factura generada con éxito', duration: 3000, color: 'success' });
      successToast.present();
      this.cdr.detectChanges();

    } catch (e) {
      await loading.dismiss();
      console.error(e);
      const errToast = await this.toastCtrl.create({ message: 'Error al generar la factura', duration: 3000, color: 'danger' });
      errToast.present();
    }
  }
}