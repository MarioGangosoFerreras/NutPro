import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, EstadisticasDashboard } from '../../../core/services/dashboard';
import { AuthService } from '../../../core/services/auth';
import { IonSkeletonText, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-estadisticas-dashboard',
  standalone: true,
  imports: [CommonModule, IonSkeletonText, IonText],
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
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) throw new Error('No se encontró nutricionista');

      this.stats = await this.dashboardService.getStats(nutricionistaId);
    } catch (err) {
      console.error('Error cargando stats:', err);
      this.error = true;
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // 👈 fuerza la actualización de la vista
    }
  }
}