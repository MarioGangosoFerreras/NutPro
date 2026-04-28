import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton, IonBadge, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { walletOutline, cashOutline, documentTextOutline, downloadOutline, trendingUpOutline, checkmarkCircle, timeOutline } from 'ionicons/icons';
import { Header } from '../../shared/components/header/header';
import { DocumentosService, Documento } from '../../core/services/documentos';
import { AuthService } from '../../core/services/auth';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton, IonBadge, IonSpinner, Header],
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css']
})
export class Facturacion implements OnInit {
  private docsService = inject(DocumentosService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  cargando = true;
  facturas: Documento[] = [];

  // KPIs
  ingresosMes = 0;
  ingresosAnio = 0;
  facturasMes = 0;
  ticketMedio = 0;

  chartInstance: Chart | null = null;

  constructor() {
    addIcons({ walletOutline, cashOutline, documentTextOutline, downloadOutline, trendingUpOutline, checkmarkCircle, timeOutline });
  }

  async ngOnInit() {
    try {
      const nutriId = await this.authService.getNutricionistaId();
      if (!nutriId) return;

      this.facturas = await this.docsService.getFacturasNutricionista(nutriId);
      this.calcularKPIs();

      // Damos tiempo a que se renderice el canvas
      setTimeout(() => this.renderizarGrafico(), 100);

    } catch (e) {
      console.error('Error cargando facturas:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  // 1. Modifica calcularKPIs para que solo sume lo PAGADO
  calcularKPIs() {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    this.ingresosMes = 0;
    this.ingresosAnio = 0;
    this.facturasMes = 0;

    this.facturas.forEach(f => {
      const fecha = new Date(f.created_at);
      const importe = f.importe || 0;

      if (fecha.getFullYear() === anioActual) {
        // 👇 SOLO SUMAMOS AL TOTAL SI ESTÁ PAGADA
        if (f.pagado) {
          this.ingresosAnio += importe;
          if (fecha.getMonth() === mesActual) {
            this.ingresosMes += importe;
          }
        }

        // Las facturas emitidas (conteo) las seguimos contando todas
        if (fecha.getMonth() === mesActual) {
          this.facturasMes++;
        }
      }
    });

    this.ticketMedio = this.facturasMes > 0 ? (this.ingresosMes / this.facturasMes) : 0;
  }

  // 2. Modifica el gráfico para que muestre solo lo COBRADO
  renderizarGrafico() {
    const canvas = document.getElementById('ingresosChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.chartInstance) this.chartInstance.destroy();

    const ingresosCobrados = new Array(12).fill(0);
    const anioActual = new Date().getFullYear();

    this.facturas.forEach(f => {
      const fecha = new Date(f.created_at);
      // 👇 SOLO FILTRAMOS LOS PAGADOS PARA EL GRÁFICO
      if (fecha.getFullYear() === anioActual && f.pagado) {
        ingresosCobrados[fecha.getMonth()] += (f.importe || 0);
      }
    });

    this.chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        datasets: [{
          label: 'Ingresos Reales (€)',
          data: ingresosCobrados,
          backgroundColor: '#2d6a4f',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Activa las funciones en togglePago
  async togglePago(factura: Documento) {
    const nuevoEstado = !factura.pagado;
    try {
      await this.docsService.actualizarEstadoPago(factura.id, nuevoEstado);

      // Actualizamos el objeto localmente
      factura.pagado = nuevoEstado;

      // 👇 AHORA SÍ: Recalculamos todo para que el gráfico se mueva
      this.calcularKPIs();
      this.renderizarGrafico();

      const toast = await this.toastCtrl.create({
        message: nuevoEstado ? 'Factura cobrada' : 'Factura pendiente',
        duration: 2000,
        color: nuevoEstado ? 'success' : 'warning',
        position: 'bottom'
      });
      await toast.present();
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error:', e);
    }
  }
}