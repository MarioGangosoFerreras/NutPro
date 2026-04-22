import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton, IonBadge, IonAvatar, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { banOutline, checkmarkCircleOutline, closeCircleOutline, personCircleOutline, refreshOutline } from 'ionicons/icons';
import { AdminService } from '../../../core/services/admin';

@Component({
  selector: 'app-panel-admin',
  imports: [
    Header,
    IonContent, IonList, IonItem, IonLabel, IonButton, IonBadge, IonAvatar, IonIcon
  ],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css'
})
export class PanelAdmin implements OnInit {
  nutricionistasPendientes: any[] = [];
  nutricionistasActivos: any[] = [];
  nutricionistasInactivos: any[] = [];

  loading = true;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, personCircleOutline, banOutline, refreshOutline });
  }

  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    if (usuario?.rol !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    try {
      this.nutricionistasPendientes = await this.adminService.getNutricionistasPorEstado('pendiente');
      this.nutricionistasActivos = await this.adminService.getNutricionistasPorEstado('activo');
      this.nutricionistasInactivos = await this.adminService.getNutricionistasPorEstado('inactivo');
    } catch (error) {
      console.error('Error cargando nutricionistas:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async aprobar(nutricionistaId: string) {
    await this.adminService.cambiarEstado(nutricionistaId, 'activo');
    await this.ngOnInit();
  }

  async rechazar(nutricionistaId: string) {
    await this.adminService.cambiarEstado(nutricionistaId, 'rechazado');
    await this.ngOnInit();
  }

  async eliminar(nutricionistaId: string) {
    await this.adminService.desactivarNutricionista(nutricionistaId);
    await this.ngOnInit();
  }
}