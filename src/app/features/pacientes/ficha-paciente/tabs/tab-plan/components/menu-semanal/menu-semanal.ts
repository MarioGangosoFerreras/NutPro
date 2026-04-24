import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, IonBadge, ModalController, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, restaurantOutline } from 'ionicons/icons';
import { PlanNutricionalService } from '../../../../../../../core/services/plan-nutricional';
import { ModalSeleccionarReceta } from '../modal-selecionar-receta/modal-selecionar-receta';

@Component({
  selector: 'app-menu-semanal',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonButton, IonIcon, IonSpinner],
  templateUrl: './menu-semanal.html',
  styleUrls: ['./menu-semanal.css']
})
export class MenuSemanalComponent implements OnInit {
  @Input() planId!: string;
  @Input() pacienteId!: string;

  private planService = inject(PlanNutricionalService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef);

  cargando = true;
  menuActivo: any = null;
  entradas: any[] = [];

  dias = [
    { id: 1, nombre: 'Lunes' }, { id: 2, nombre: 'Martes' }, { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' }, { id: 5, nombre: 'Viernes' }, { id: 6, nombre: 'Sábado' }, { id: 7, nombre: 'Domingo' }
  ];

  // Basado en tu enum 'tipo_comida'
  tiposComida = [
    { id: 'desayuno', label: 'Desayuno' },
    { id: 'almuerzo', label: 'Almuerzo' },
    { id: 'snack', label: 'Snack' },
    { id: 'cena', label: 'Cena' }
  ];

  constructor() {
    addIcons({ addOutline, trashOutline, restaurantOutline });
  }

  async ngOnInit() {
    await this.cargarMenu();
  }

  async cargarMenu() {
    this.cargando = true;
    try {
      // Estos métodos ahora existen en el servicio actualizado arriba
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
    return this.entradas.filter(e => e.dia_semana === diaId && e.tipo_comida === tipoComida);
  }

  async abrirModalRecetas(diaId: number, tipoComida: string) {
    const modal = await this.modalCtrl.create({
      component: ModalSeleccionarReceta,
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.8
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
        menu_id: this.menuActivo.id,
        receta_id: receta.id,
        dia_semana: diaId,
        tipo_comida: tipoComida,
        raciones: 1
      });
      // Añadimos al array local para actualizar la vista sin recargar de BD
      this.entradas.push(nuevaEntrada);
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error añadiendo receta:', e);
    }
  }

  async eliminarEntrada(entradaId: string) {
    try {
      await this.planService.deleteEntradaMenu(entradaId);
      this.entradas = this.entradas.filter(e => e.id !== entradaId);
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error eliminando entrada:', e);
    }
  }
}