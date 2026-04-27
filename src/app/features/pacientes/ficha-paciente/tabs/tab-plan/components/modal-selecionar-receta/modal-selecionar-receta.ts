import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core'; // <-- 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, ModalController, IonThumbnail } from '@ionic/angular/standalone';
import { RecetaService } from '../../../../../../../core/services/receta';
import { addIcons } from 'ionicons';
import { closeOutline, restaurantOutline } from 'ionicons/icons';

@Component({
  selector: 'app-modal-seleccionar-receta',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, IonThumbnail],
  templateUrl: './modal-selecionar-receta.html'
})
export class ModalSeleccionarReceta implements OnInit {
  @Input() alergias: string[] = [];
  @Input() intolerancias: string[] = [];

  private recetaService = inject(RecetaService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef); 
  
  recetas: any[] = [];
  recetasFiltradas: any[] = [];
  cargando = true;

  constructor() {
    addIcons({ closeOutline, restaurantOutline });
  }

  async ngOnInit() {
    try {
      const todas = await this.recetaService.getRecetas();
      
      // Pasar a minúsculas para comparar más fácil
      const alergiasLower = (this.alergias || []).map(a => a.toLowerCase());
      const intolLower = (this.intolerancias || []).map(i => i.toLowerCase());

      // FILTRADO INTELIGENTE
      this.recetas = todas.filter(r => {
        const etiquetas = r.etiquetas || [];
        
        // Reglas de exclusión (puedes ampliar esto según tus etiquetas)
        if ((alergiasLower.includes('gluten') || intolLower.includes('gluten')) && !etiquetas.includes('sin_gluten')) return false;
        if ((alergiasLower.includes('lactosa') || intolLower.includes('lactosa')) && !etiquetas.includes('sin_lactosa')) return false;
        if (alergiasLower.includes('vegano') && !etiquetas.includes('vegano')) return false;
        
        return true;
      });

      this.recetasFiltradas = [...this.recetas];
    } catch (e) {
      console.error('Error cargando recetas:', e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges(); 
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