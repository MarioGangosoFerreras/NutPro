import { Component, OnInit, ChangeDetectorRef, signal  } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { Header } from "../../../shared/components/header/header";
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";
import { EstadisticasDashboardComponent } from '../estadisticas-dashboard/estadisticas-dashboard';
import { ListaPacientesPreviewComponent } from "../lista-pacientes-preview/lista-pacientes-preview";
import { CalendarioCitas } from "../calendario-citas/calendario-citas";
imports: [CommonModule, IonContent, IonButton, Header, RouterLink, UniversalCalendar]
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, IonContent, Header, EstadisticasDashboardComponent, ListaPacientesPreviewComponent, UniversalCalendar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  nombreUsuario = '';
  cargandoPagina = signal(true);

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

      // Simulamos un pequeño delay de 1 segundo para que los componentes 
      // hijos tengan tiempo de iniciar sus peticiones en segundo plano
      setTimeout(() => {
        this.cargandoPagina.set(false);
        this.cdr.detectChanges();
      }, 1000);

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