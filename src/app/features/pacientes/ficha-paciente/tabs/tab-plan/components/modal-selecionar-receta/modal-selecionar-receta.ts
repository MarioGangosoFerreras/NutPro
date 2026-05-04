import { Component, OnInit, inject, ChangeDetectorRef, Input } from '@angular/core'; // <-- 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, ModalController, IonThumbnail } from '@ionic/angular/standalone';
import { RecetaService } from '../../../../../../../core/services/receta';
import { addIcons } from 'ionicons';
import { closeOutline, restaurantOutline } from 'ionicons/icons';

/**
 * Componente Modal Ionic diseñado para buscar, filtrar y seleccionar un plato
 * de entre toda la base de datos de recetas del profesional cuando está configurando un menú, 
 * prestando atención en aplicar automáticamente cruces de alergias (filtros de protección).
 *
 * @export
 * @class ModalSeleccionarReceta
 * @implements {OnInit}
 */
@Component({
  selector: 'app-modal-seleccionar-receta',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, IonThumbnail],
  templateUrl: './modal-selecionar-receta.html'
})
export class ModalSeleccionarReceta implements OnInit {
  /** Recibe como propiedad del componente padre si hay alergias escritas (e.g. gluten) en la ficha clínica del paciente. */
  @Input() alergias: string[] = [];
  /** Recibe del paciente posibles intolerancias escritas. */
  @Input() intolerancias: string[] = [];

  private recetaService = inject(RecetaService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef); 
  
  /** Lista cruda devuelta por API con sus respectivos resultados completos. */
  recetas: any[] = [];
  /** Lista auxiliar sobre la que el SearchBar hace iteraciones visuales y condicionales. */
  recetasFiltradas: any[] = [];
  
  cargando = true;

  /** Configura los dos iconos únicos vectorizados empleados en el html superior e inferior. */
  constructor() {
    addIcons({ closeOutline, restaurantOutline });
  }

  /**
   * Al levantarse el modal, ejecuta en primera instancia la consulta global de recetas,
   * procediendo después a auto-ocultar (limpiar del array base `recetas`) aquellas cuyos tags 
   * entren en conflicto clínico con las variables enviadas del paciente.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Callback originado del searchbar nativo, actualiza mediante un `.filter` la 
   * lista a repintar según coincidencia de string sin ser case-sensitive.
   *
   * @param {*} event - Change output angular variable detail nativa del ion.
   */
  buscar(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.recetasFiltradas = this.recetas.filter(r => 
      r.nombre?.toLowerCase().includes(query)
    );
    this.cdr.detectChanges(); // <-- Opcional, pero asegura la fluidez al buscar
  }

  /**
   * Método accionado al interactuar como Clic en un elemento (plato) individual 
   * provocando la bajada final (dismiss) resolviendo y publicando data en `role='seleccionado'`.
   *
   * @param {*} receta - Instancia con su JSON asignado y preconfigurado internamente.
   */
  seleccionar(receta: any) {
    this.modalCtrl.dismiss(receta, 'seleccionado');
  }

  /**
   * Mata la previsualización global emitiendo nulo hacia quien llamó modal present.
   */
  cerrar() {
    this.modalCtrl.dismiss();
  }
}