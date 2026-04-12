import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Header } from "../../../shared/components/header/header";
import { EstadisticasDashboardComponent } from '../estadisticas-dashboard/estadisticas-dashboard';
import { ListaPacientesPreviewComponent } from "../lista-pacientes-preview/lista-pacientes-preview";

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, IonContent, Header, EstadisticasDashboardComponent, ListaPacientesPreviewComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  nombreUsuario = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarUsuario();
  }

  private async cargarUsuario() {
    try {
      const usuario = await this.authService.getUsuario();

      if (usuario?.nombre) {
        this.nombreUsuario = usuario.nombre;
        return;
      }

      // Si no hay nombre en la tabla usuarios, usamos el email como fallback
      const { data } = await this.authService.getSession();
      this.nombreUsuario = data.session?.user?.email || 'usuario';

    } catch (error) {
      const { data } = await this.authService.getSession();
      this.nombreUsuario = data.session?.user?.email || 'usuario';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}