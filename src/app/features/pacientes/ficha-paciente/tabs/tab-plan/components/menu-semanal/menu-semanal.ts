import { Component, Input, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonBadge, IonSpinner, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
  ModalController,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, restaurantOutline, downloadOutline, closeCircle } from 'ionicons/icons';
import { PlanNutricionalService } from '../../../../../../../core/services/plan-nutricional';
import { PdfService } from '../../../../../../../core/services/pdf';
import { ModalSeleccionarReceta } from '../modal-selecionar-receta/modal-selecionar-receta';

@Component({
  selector: 'app-menu-semanal',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonButton, IonIcon, IonSpinner, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent],
  templateUrl: './menu-semanal.html',
  styleUrls: ['./menu-semanal.css'],
})
export class MenuSemanalComponent implements OnInit {
  @Input() planId!: string;
  @Input() pacienteId!: string;
  @Input() caloriasObjetivo: number = 0;
  @Input() alergias: string[] = [];
  @Input() intolerancias: string[] = [];
  @Input() paciente: any;
  @Input() planActivo: any;
  
  // 👇 NUEVO: Flag para saber si lo ve el paciente (true) o el nutri (false)
  @Input() modoLectura: boolean = false; 

  private planService = inject(PlanNutricionalService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef);
  private pdfService = inject(PdfService);

  cargando = true;
  menuActivo: any = null;
  entradas: any[] = [];

  // Variables para el modal de ver receta (Modo paciente)
  modalRecetaAbierto = signal(false);
  recetaSeleccionada = signal<any>(null);

  dias = [
    { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sábado' }, { id: 7, nombre: 'Domingo' }
  ];

  tiposComida = [
    { id: 'desayuno', label: 'Desayuno' }, { id: 'comida', label: 'Comida' },
    { id: 'snack', label: 'Snacks' }, { id: 'cena', label: 'Cena' }
  ];

  constructor() {
    addIcons({ addOutline, trashOutline, restaurantOutline, downloadOutline, closeCircle });
  }

  async ngOnInit() {
    await this.cargarMenu();
  }

  async cargarMenu() {
    this.cargando = true;
    try {
      this.menuActivo = await this.planService.getOrCreateMenuParaPlan(this.planId, this.pacienteId);
      this.entradas = await this.planService.getEntradasMenu(this.menuActivo.id);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  obtenerEntradas(diaId: number, tipoComida: string) {
    return this.entradas.filter((e) => e.dia_semana === diaId && e.tipo_comida === tipoComida);
  }

  getTotalKcalDia(diaId: number): number {
    return this.entradas.filter((e) => e.dia_semana === diaId).reduce((total, e) => total + (e.receta?.calorias_kcal || 0), 0);
  }

  async abrirModalRecetas(diaId: number, tipoComida: string) {
    const modal = await this.modalCtrl.create({
      component: ModalSeleccionarReceta,
      componentProps: { alergias: this.alergias || [], intolerancias: this.intolerancias || [] },
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8,
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role === 'seleccionado' && data) {
      await this.asignarReceta(diaId, tipoComida, data);
    }
  }

  async asignarReceta(diaId: number, tipoComida: string, receta: any) {
    try {
      const nuevaEntrada = await this.planService.addEntradaMenu({
        menu_id: this.menuActivo.id, receta_id: receta.id, dia_semana: diaId, tipo_comida: tipoComida, raciones: 1
      });
      if (!nuevaEntrada.receta) nuevaEntrada.receta = receta;
      this.entradas.push(nuevaEntrada);
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async eliminarEntrada(entradaId: string) {
    try {
      await this.planService.deleteEntradaMenu(entradaId);
      this.entradas = this.entradas.filter((e) => e.id !== entradaId);
      this.cdr.detectChanges();
    } catch (e) { console.error(e); }
  }

  async exportarPDF() {
    if (!this.paciente || !this.planActivo) return;
    this.cargando = true;
    try {
      await this.pdfService.exportarMenuSemanal(this.paciente, this.planActivo, this.entradas);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  // 👇 NUEVO: Lógica para abrir el detalle si es paciente
  abrirReceta(receta: any) {
    if (!this.modoLectura || !receta) return;
    this.recetaSeleccionada.set(receta);
    this.modalRecetaAbierto.set(true);
  }
  
  cerrarReceta() {
    this.modalRecetaAbierto.set(false);
    setTimeout(() => this.recetaSeleccionada.set(null), 300);
  }
}