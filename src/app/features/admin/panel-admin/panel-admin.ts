import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton,
  IonSpinner, IonBadge, IonAvatar, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, personCircleOutline, trashOutline } from 'ionicons/icons';
import { AdminService } from '../../../core/services/admin';

@Component({
  selector: 'app-panel-admin',
  imports: [
    Header,
    IonContent, IonList, IonItem, IonLabel, IonButton,
    IonSpinner, IonBadge, IonAvatar, IonIcon
  ],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css'
})
export class PanelAdmin implements OnInit {
  nutricionistasPendientes: any[] = [];
  nutricionistasActivos: any[] = [];
  loading = true;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, personCircleOutline, trashOutline });
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
  await this.adminService.eliminarNutricionista(nutricionistaId);
  await this.ngOnInit();
}
}