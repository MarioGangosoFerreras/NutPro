import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton,
  IonIcon, IonSpinner, IonAvatar, IonBadge, IonFab, IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, personOutline, callOutline, mailOutline, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-pacientes',
  imports: [
    Header, IonContent, IonList, IonItem, IonLabel, IonButton,
    IonIcon, IonSpinner, IonAvatar, IonBadge, IonFab, IonFabButton,
  ],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
})
export class ListaPacientes implements OnInit {
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  loading = signal<boolean>(true);
  busquedaActiva = signal<string>('');
  version = 0;

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,  // 👈
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ addOutline, personOutline, callOutline, mailOutline, searchOutline });
  }

  ngOnInit() {}

  async ionViewWillEnter() {
    this.loading.set(true);
  }

  async ionViewDidEnter() {
    this.version = new Date().getTime();
    await this.cargarPacientes();

    // Lee ?q= del header tras cargar
    this.route.queryParams.subscribe(params => {
      const q = params['q'] ?? '';
      this.busquedaActiva.set(q);
      this.aplicarFiltro(q);
    });
  }

  private async cargarPacientes() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) { this.loading.set(false); return; }

      const data = await this.pacientesService.getPacientes(nutricionistaId);

      Promise.resolve().then(() => {
        this.pacientes.set(data || []);
        this.pacientesFiltrados.set(data || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('Error cargando:', error);
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  private aplicarFiltro(query: string) {
    if (!query.trim()) {
      this.pacientesFiltrados.set(this.pacientes());
      return;
    }

    const q = query.toLowerCase().trim();
    const filtrados = this.pacientes().filter(p => {
      const nombre = `${p.usuario?.nombre ?? ''} ${p.usuario?.apellidos ?? ''}`.toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      const telefono = (p.telefono ?? '').toLowerCase();
      return nombre.includes(q) || email.includes(q) || telefono.includes(q);
    });

    this.pacientesFiltrados.set(filtrados);
    this.cdr.detectChanges();
  }

  limpiarBusqueda() {
    this.busquedaActiva.set('');
    this.router.navigate(['/pacientes']);
  }

  verPaciente(id: string) { this.router.navigate(['/pacientes', id]); }
  nuevoPaciente() { this.router.navigate(['/pacientes/nuevo']); }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }
}