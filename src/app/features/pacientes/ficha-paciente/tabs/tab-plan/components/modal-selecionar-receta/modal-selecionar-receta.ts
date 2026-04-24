import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, ModalController } from '@ionic/angular/standalone';
import { RecetaService } from '../../../../../../../core/services/receta';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-modal-seleccionar-receta',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner],
  templateUrl: './modal-selecionar-receta.html'
})
export class ModalSeleccionarReceta implements OnInit {
  private recetaService = inject(RecetaService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef); // <-- 2. Inyectar ChangeDetectorRef
  
  recetas: any[] = [];
  recetasFiltradas: any[] = [];
  cargando = true;

  constructor() {
    addIcons({ closeOutline });
  }

  async ngOnInit() {
    try {
      this.recetas = await this.recetaService.getRecetas();
      this.recetasFiltradas = [...this.recetas];
    } catch (e) {
      console.error('Error cargando recetas:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges(); // <-- 3. Forzar actualización de la vista al quitar el spinner
    }
  }

  buscar(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.recetasFiltradas = this.recetas.filter(r => 
      r.nombre?.toLowerCase().includes(query)
    );
    this.cdr.detectChanges(); // <-- Opcional, pero asegura la fluidez al buscar
  }

  seleccionar(receta: any) {
    this.modalCtrl.dismiss(receta, 'seleccionado');
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}