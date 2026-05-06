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

/**
 * Componente para el panel de administración de nutricionistas.
 * Permite gestionar nutricionistas pendientes, activos e inactivos.
 */
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
  /** Lista de nutricionistas pendientes de aprobación. */
  nutricionistasPendientes: any[] = [];
  /** Lista de nutricionistas activos. */
  nutricionistasActivos: any[] = [];
  /** Lista de nutricionistas inactivos. */
  nutricionistasInactivos: any[] = [];

  /** Indicador de carga. */
  loading = true;

  /**
   * Constructor del componente PanelAdmin.
   * @param adminService Servicio para operaciones de administración.
   * @param authService Servicio de autenticación.
   * @param router Router de Angular.
   * @param cdr ChangeDetectorRef para detección de cambios.
   */
  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, personCircleOutline, banOutline, refreshOutline });
  }

  /**
   * Método de inicialización del componente.
   * Verifica el rol del usuario y carga las listas de nutricionistas.
   */
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

  /**
   * Aprueba un nutricionista pendiente, cambiándolo a activo.
   * @param nutricionistaId ID del nutricionista a aprobar.
   */
  async aprobar(nutricionistaId: string) {
    await this.adminService.cambiarEstado(nutricionistaId, 'activo');
    await this.ngOnInit();
  }

  /**
   * Rechaza un nutricionista pendiente, cambiándolo a rechazado.
   * @param nutricionistaId ID del nutricionista a rechazar.
   */
  async rechazar(nutricionistaId: string) {
    await this.adminService.cambiarEstado(nutricionistaId, 'rechazado');
    await this.ngOnInit();
  }

  /**
   * Elimina (desactiva) un nutricionista.
   * @param nutricionistaId ID del nutricionista a eliminar.
   */
  async eliminar(nutricionistaId: string) {
    await this.adminService.desactivarNutricionista(nutricionistaId);
    await this.ngOnInit();
  }
}