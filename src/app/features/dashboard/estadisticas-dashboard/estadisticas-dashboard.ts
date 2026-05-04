import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, EstadisticasDashboard } from '../../../core/services/dashboard';
import { AuthService } from '../../../core/services/auth';
import { IonSkeletonText, IonText } from '@ionic/angular/standalone';

/**
 * Componente hijo que se encarga de solicitar, mostrar y visualizar
 * los indicadores clave (KPIs) y estadísticas en el dashboard del nutricionista.
 *
 * @export
 * @class EstadisticasDashboardComponent
 * @implements {OnInit}
 */
@Component({
  selector: 'app-estadisticas-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonSkeletonText, IonText],
  templateUrl: './estadisticas-dashboard.html',
  styleUrls: ['./estadisticas-dashboard.css'],
})
export class EstadisticasDashboardComponent implements OnInit {
  stats: EstadisticasDashboard | null = null;
  loading = true;
  error = false;

  /**
   * Crea una instancia del componente EstadisticasDashboardComponent.
   *
   * @param {DashboardService} dashboardService - Servicio para consultar las estadísticas.
   * @param {AuthService} authService - Servicio de autenticación para consultar el ID del usuario.
   * @param {ChangeDetectorRef} cdr - Referencia al detector de cambios para actualizaciones forzadas de UI.
   */
  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Método de inicialización en el ciclo de vida de Angular.
   * Llama a cargarStats inmediatamente.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    await this.cargarStats();
  }

  // EXTRAEMOS LA LÓGICA A UN MÉTODO PÚBLICO 
  /**
   * Realiza la petición asíncrona a la base de datos para cargar las estadísticas del nutricionista.
   * Actualiza las propiedades internas `stats`, `loading` y `error`.
   *
   * @returns {Promise<void>}
   */
  async cargarStats() {
    this.loading = true; // Volvemos a mostrar el esqueleto al recargar
    this.cdr.detectChanges();

    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) throw new Error('No se encontró nutricionista');

      this.stats = await this.dashboardService.getStats(nutricionistaId);
    } catch (err) {
      console.error('Error cargando stats:', err);
      this.error = true;
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }
}