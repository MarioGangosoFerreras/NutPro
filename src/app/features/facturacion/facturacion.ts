import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton, IonBadge, IonSpinner, ToastController, ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { walletOutline, cashOutline, documentTextOutline, downloadOutline, trendingUpOutline, checkmarkCircle, timeOutline } from 'ionicons/icons';
import { Header } from '../../shared/components/header/header';
import { DocumentosService, Documento } from '../../core/services/documentos';
import { AuthService } from '../../core/services/auth';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/**
 * Componente principal del módulo de Facturación.
 * Muestra métricas clave (KPIs), un gráfico de la evolución de los ingresos,
 * y la lista de facturas emitidas, permitiendo marcar su estado de pago.
 *
 * @export
 * @class Facturacion
 * @implements {ViewWillEnter}
 */
@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton, IonBadge, Header],
  templateUrl: './facturacion.html',
  styleUrls: ['./facturacion.css']
})
export class Facturacion implements ViewWillEnter {
  private docsService = inject(DocumentosService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private toastCtrl = inject(ToastController);

  cargando = true;
  /** Arreglo que almacena las facturas cargadas desde la base de datos */
  facturas: Documento[] = [];

  // KPIs
  ingresosMes = 0;
  ingresosAnio = 0;
  facturasMes = 0;
  ticketMedio = 0;

  /** Instancia de la gráfica de Chart.js para su posterior destrucción y renderizado */
  chartInstance: Chart | null = null;

  /**
   * Crea una instancia del componente Facturacion y registra los iconos usados en la vista.
   */
  constructor() {
    addIcons({ walletOutline, cashOutline, documentTextOutline, downloadOutline, trendingUpOutline, checkmarkCircle, timeOutline });
  }

  /**
   * Método del ciclo de vida de Ionic ejecutado justo antes de mostrar la vista.
   * Carga las facturas del nutricionista actual, calcula los KPIs y renderiza la gráfica.
   *
   * @returns {Promise<void>}
   */
  async ionViewWillEnter() {
    this.cargando = true;
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

  /**
   * Calcula los Indicadores Clave de Rendimiento (KPIs) en base a las facturas actuales.
   * Acumula los importes de las facturas cobradas para los ingresos y cuenta todas las facturas del mes.
   *
   * @returns {void}
   */
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
        // SOLO SUMAMOS AL TOTAL SI ESTÁ PAGADA
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

  /**
   * Renderiza un gráfico de barras (Chart.js) que representa los ingresos reales (facturas cobradas) 
   * agrupados por meses durante el año actual.
   *
   * @returns {void}
   */
  // 2. Modifica el gráfico para que muestre solo lo COBRADO
  renderizarGrafico() {
    const canvas = document.getElementById('ingresosChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.chartInstance) this.chartInstance.destroy();

    const ingresosCobrados = new Array(12).fill(0);
    const anioActual = new Date().getFullYear();

    this.facturas.forEach(f => {
      const fecha = new Date(f.created_at);
      // SOLO FILTRAMOS LOS PAGADOS PARA EL GRÁFICO
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

  /**
   * Alterna el estado de pago de una factura en la base de datos y localmente.
   * Al hacerlo, recalcula los KPIs y la gráfica, reflejando el cambio de ingresos reales.
   *
   * @param {Documento} factura - El objeto factura sobre el cual alterar el estado de pago.
   * @returns {Promise<void>}
   */
  // 3. Activa las funciones en togglePago
  async togglePago(factura: Documento) {
    const nuevoEstado = !factura.pagado;
    try {
      await this.docsService.actualizarEstadoPago(factura.id, nuevoEstado);

      // Actualizamos el objeto localmente
      factura.pagado = nuevoEstado;

      // Recalculamos todo para que el gráfico se mueva
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