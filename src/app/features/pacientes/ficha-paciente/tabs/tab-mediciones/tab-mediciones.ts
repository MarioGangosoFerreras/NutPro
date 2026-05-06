import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonContent,
  IonItem,
  IonInput,
  IonTextarea,
  ToastController,
  AlertController,
  IonDatetime,      
  IonDatetimeButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, scaleOutline, createOutline, trashOutline, listOutline,
  barChartOutline, closeOutline, saveOutline,
} from 'ionicons/icons';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

type TipoGrafica = 'peso' | 'grasa' | 'musculo' | 'cintura' | 'cadera' | 'abdomen';

/**
 * Componente que representa la pestaña de "Mediciones" (evolución antropométrica).
 * Visualiza la lista de medidas tomadas a un paciente con opciones a representar
 * gráficas evolutivas, basándose en la librería Chart.js.
 *
 * @export
 * @class TabMediciones
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-mediciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonIcon, IonSpinner, IonBadge, IonCard,
    IonCardContent, IonCardHeader, IonModal, IonSegment, IonSegmentButton,
    IonLabel, IonContent, IonItem, IonInput, IonTextarea,
    IonDatetime, IonDatetimeButton // <-- AÑADIDOS
  ],
  templateUrl: './tab-mediciones.html',
  styleUrl: './tab-mediciones.css',
})
export class TabMediciones implements OnInit {
  @Input() paciente: any;
  @Input() vistaInicial: 'lista' | 'grafico' = 'lista';
  @Input() modoPantallaCompleta: boolean = false;
  @Input() esPaciente: boolean = false;

  mediciones: any[] = [];
  loading = false;
  guardandoMedicion = false;
  modalNueva = false;
  modalEditar = false;
  vistaActual: 'lista' | 'grafico' = 'lista';
  graficaActiva: TipoGrafica = 'peso';

  nuevaMedicion: any = this.medicionVacia();
  medicionEditando: any = {};

  private chartInstance: Chart | null = null;

  /**
   * Retorna la fecha máxima permitida (hoy) para evitar pesajes en el futuro.
   */
  get maxDateHoy(): string {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().split('T')[0];
  }

  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({ addOutline, scaleOutline, createOutline, trashOutline, listOutline, barChartOutline, closeOutline, saveOutline });
  }

  async ngOnInit() {
    this.vistaActual = this.vistaInicial;
    await this.cargarMediciones();
  }

  private medicionVacia() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      peso_kg: null, altura_cm: null, grasa_corporal_pct: null, masa_muscular_kg: null,
      perimetro_cintura_cm: null, perimetro_cadera_cm: null, perimetro_abdomen_cm: null, notas: '',
    };
  }

  private async cargarMediciones() {
    this.loading = true;
    try {
      this.mediciones = await this.fichaClinicaService.getMediciones(this.paciente.id);
      if ((this.vistaActual === 'grafico' || this.modoPantallaCompleta) && this.mediciones.length > 0) {
        setTimeout(() => this.renderizarGrafico(), 200);
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  abrirNueva() {
    this.nuevaMedicion = this.medicionVacia();
    this.modalNueva = true;
  }

  abrirEditar(m: any) {
    this.medicionEditando = { ...m };
    this.modalEditar = true;
  }

  async guardarNueva() {
    this.guardandoMedicion = true;
    try {
      this.nuevaMedicion.registrado_por = this.esPaciente ? 'paciente' : 'nutricionista';
      await this.fichaClinicaService.addMedicion(this.paciente.id, this.nuevaMedicion);
      this.guardandoMedicion = false;
      this.modalNueva = false;
      this.cdr.detectChanges();
      await this.cargarMediciones();
      await this.mostrarToast('Medición añadida', 'success');
    } catch (e) {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
      await this.mostrarToast('Error al guardar', 'danger');
    }
  }

  async guardarEdicion() {
    this.guardandoMedicion = true;
    try {
      await this.fichaClinicaService.updateMedicion(this.medicionEditando.id, this.medicionEditando);
      this.guardandoMedicion = false;
      this.modalEditar = false;
      this.cdr.detectChanges();
      await this.cargarMediciones();
      await this.mostrarToast('Medición actualizada', 'success');
    } catch (e) {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
      await this.mostrarToast('Error al actualizar', 'danger');
    }
  }

  puedoEditarMedida(medida: any): boolean {
    if (!this.esPaciente) return true;
    return medida.registrado_por === 'paciente';
  }

  cambiarGrafica(tipo: TipoGrafica) {
    this.graficaActiva = tipo;
    this.renderizarGrafico();
    this.cdr.detectChanges();
  }

  private renderizarGrafico() {
    const canvas = document.getElementById('medicionesChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.chartInstance?.destroy();

    const ordenadas = [...this.mediciones].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const configs: Record<string, { campo: string; label: string; color: string }> = {
      peso: { campo: 'peso_kg', label: 'Peso (kg)', color: '#2d6a4f' },
      grasa: { campo: 'grasa_corporal_pct', label: 'Grasa corporal (%)', color: '#e07b39' },
      musculo: { campo: 'masa_muscular_kg', label: 'Masa muscular (kg)', color: '#3b82f6' },
      cintura: { campo: 'perimetro_cintura_cm', label: 'Cintura (cm)', color: '#a855f7' },
      cadera: { campo: 'perimetro_cadera_cm', label: 'Cadera (cm)', color: '#ec4899' },
      abdomen: { campo: 'perimetro_abdomen_cm', label: 'Abdomen (cm)', color: '#6366f1' },
    };

    const cfg = configs[this.graficaActiva];
    if (!cfg) return;

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ordenadas.map((m) => { const d = new Date(m.fecha); return `${d.getDate()}/${d.getMonth() + 1}`; }),
        datasets: [{
          label: cfg.label, data: ordenadas.map((m) => m[cfg.campo] ?? null), borderColor: cfg.color, backgroundColor: cfg.color + '18',
          fill: true, tension: 0.4, spanGaps: true, pointBackgroundColor: cfg.color, pointRadius: 5,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false } } },
    });
  }

  async confirmarEliminar(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar', message: '¿Borrar esta medición?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí', role: 'destructive', handler: async () => {
            await this.fichaClinicaService.deleteMedicion(id);
            this.mediciones = this.mediciones.filter((m) => m.id !== id);
            if (this.vistaActual === 'grafico' || this.modoPantallaCompleta) this.renderizarGrafico();
            this.cdr.detectChanges();
          }
        },
      ],
    });
    await alert.present();
  }

  cambiarVista(event: any) {
    this.vistaActual = event.detail.value;
    if (this.vistaActual === 'grafico') setTimeout(() => this.renderizarGrafico(), 100);
    this.cdr.detectChanges();
  }

  imcCategoria(imc: number) {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'warning' };
    if (imc < 25) return { label: 'Normopeso', color: 'success' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'warning' };
    return { label: 'Obesidad', color: 'danger' };
  }

  iccCategoria(icc: number, sexo: string) {
    const esMujer = sexo === 'femenino';
    if (esMujer) {
      if (icc < 0.75) return { label: 'Bajo riesgo', color: 'warning' };
      if (icc < 0.85) return { label: 'Normal', color: 'success' };
      return { label: 'Riesgo alto', color: 'danger' };
    }
    if (icc < 0.8) return { label: 'Bajo riesgo', color: 'warning' };
    if (icc < 0.9) return { label: 'Normal', color: 'success' };
    return { label: 'Riesgo alto', color: 'danger' };
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}