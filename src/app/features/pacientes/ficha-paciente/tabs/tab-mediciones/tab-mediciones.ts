import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FichaClinicaService } from '../../../../../core/services/ficha-clinica';
import {
  IonButton, IonIcon, IonSpinner, IonBadge, IonCard,
  IonCardContent, IonCardHeader, IonCardTitle, IonModal,
  IonSegment, IonSegmentButton, IonLabel,
  IonContent, IonItem, IonInput, IonTextarea,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, scaleOutline, createOutline, trashOutline,
  listOutline, barChartOutline, closeOutline, saveOutline,
} from 'ionicons/icons';

// Chart.js - importa solo lo necesario
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-tab-mediciones',
  imports: [
    FormsModule,
    IonButton, IonIcon, IonSpinner, IonBadge, IonCard,
    IonCardContent, IonCardHeader, IonCardTitle, IonModal,
    IonSegment, IonSegmentButton, IonLabel,
    IonContent, IonItem, IonInput, IonTextarea,
  ],
  templateUrl: './tab-mediciones.html',
  styleUrl: './tab-mediciones.css',
})
export class TabMediciones implements OnInit {
  @Input() paciente: any;

  mediciones: any[] = [];
  loading = false;
  guardandoMedicion = false;
  modalNueva = false;
  modalEditar = false;
  vistaActual: 'lista' | 'grafico' = 'lista';
  graficaActiva: 'peso' | 'grasa' | 'musculo' | 'cintura' = 'peso';

  nuevaMedicion: any = this.medicionVacia();
  medicionEditando: any = {};

  private chartInstance: Chart | null = null;

  constructor(
    private fichaClinicaService: FichaClinicaService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({ addOutline, scaleOutline, createOutline, trashOutline, listOutline, barChartOutline, closeOutline, saveOutline });
  }

  async ngOnInit() {
    await this.cargarMediciones();
  }

  private medicionVacia() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      peso_kg: null, altura_cm: null, grasa_corporal_pct: null,
      masa_muscular_kg: null, perimetro_cintura_cm: null,
      perimetro_cadera_cm: null, perimetro_abdomen_cm: null, notas: '',
    };
  }

  private async cargarMediciones() {
    this.loading = true;
    try {
      this.mediciones = await this.fichaClinicaService.getMediciones(this.paciente.id);
    } catch (e) {
      console.error(e);
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
      await this.fichaClinicaService.addMedicion(this.paciente.id, this.nuevaMedicion);
      await this.cargarMediciones();
      this.modalNueva = false;
      if (this.vistaActual === 'grafico') setTimeout(() => this.renderizarGrafico(), 100);
      await this.mostrarToast('Medición añadida', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al guardar la medición', 'danger');
    } finally {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
    }
  }

  async guardarEdicion() {
    this.guardandoMedicion = true;
    try {
      await this.fichaClinicaService.updateMedicion(this.medicionEditando.id, this.medicionEditando);
      await this.cargarMediciones();
      this.modalEditar = false;
      if (this.vistaActual === 'grafico') setTimeout(() => this.renderizarGrafico(), 100);
      await this.mostrarToast('Medición actualizada', 'success');
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al actualizar la medición', 'danger');
    } finally {
      this.guardandoMedicion = false;
      this.cdr.detectChanges();
    }
  }

  async confirmarEliminar(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar medición',
      message: '¿Seguro que quieres eliminar esta medición?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: async () => {
            await this.fichaClinicaService.deleteMedicion(id);
            this.mediciones = this.mediciones.filter(m => m.id !== id);
            if (this.vistaActual === 'grafico') setTimeout(() => this.renderizarGrafico(), 100);
            this.cdr.detectChanges();
          },
        },
      ],
    });
    await alert.present();
  }

  cambiarVista(event: any) {
    this.vistaActual = event.detail.value;
    if (this.vistaActual === 'grafico') {
      setTimeout(() => this.renderizarGrafico(), 100);
    } else {
      this.chartInstance?.destroy();
      this.chartInstance = null;
    }
    this.cdr.detectChanges();
  }

  cambiarGrafica(tipo: 'peso' | 'grasa' | 'musculo' | 'cintura') {
    this.graficaActiva = tipo;
    this.renderizarGrafico();
  }

  private renderizarGrafico() {
    const canvas = document.getElementById('medicionesChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.chartInstance?.destroy();

    const ordenadas = [...this.mediciones].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const configs: Record<string, { campo: string; label: string; color: string }> = {
      peso:    { campo: 'peso_kg',              label: 'Peso (kg)',          color: '#2d6a4f' },
      grasa:   { campo: 'grasa_corporal_pct',   label: 'Grasa corporal (%)', color: '#e07b39' },
      musculo: { campo: 'masa_muscular_kg',      label: 'Masa muscular (kg)', color: '#3b82f6' },
      cintura: { campo: 'perimetro_cintura_cm',  label: 'Cintura (cm)',       color: '#a855f7' },
    };

    const cfg = configs[this.graficaActiva];
    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ordenadas.map(m => m.fecha),
        datasets: [{
          label: cfg.label,
          data: ordenadas.map(m => m[cfg.campo] ?? null),
          borderColor: cfg.color,
          backgroundColor: cfg.color + '18',
          fill: true, tension: 0.4, spanGaps: true,
          pointBackgroundColor: cfg.color, pointRadius: 5, pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#f1f5f9' }, beginAtZero: false },
        },
      },
    });
  }

  imcCategoria(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'warning' };
    if (imc < 25)   return { label: 'Normopeso', color: 'success' };
    if (imc < 30)   return { label: 'Sobrepeso', color: 'warning' };
    return { label: 'Obesidad', color: 'danger' };
  }

  iccCategoria(icc: number, sexo: string): { label: string; color: string } {
    const esMujer = sexo === 'femenino';
    if (esMujer) {
      if (icc < 0.75)  return { label: 'Bajo riesgo', color: 'warning' };
      if (icc < 0.85) return { label: 'Normal', color: 'success' };
      return { label: 'Riesgo alto', color: 'danger' };
    } else {
      if (icc < 0.8) return { label: 'Bajo riesgo', color: 'warning' };
      if (icc < 0.9)  return { label: 'Normal', color: 'success' };
      return { label: 'Riesgo alto', color: 'danger' };
    }
  }

  private async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}