import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, EstadisticasDashboard } from '../../../core/services/dashboard';
import { AuthService } from '../../../core/services/auth';
import { IonSkeletonText, IonText } from '@ionic/angular/standalone';

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

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarStats();
  }

  // 👇 EXTRAEMOS LA LÓGICA A UN MÉTODO PÚBLICO 👇
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