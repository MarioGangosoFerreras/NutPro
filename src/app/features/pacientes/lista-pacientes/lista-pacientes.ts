import { Component, OnInit, ChangeDetectorRef, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  ViewWillEnter, // <--- Importante para que refresque bien
  IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon,
  IonSpinner, IonAvatar, IonBadge, IonFab, IonFabButton,
  IonHeader, IonToolbar, IonSearchbar, ToastController, IonFabList // <--- Añadimos Toast y FabList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, personOutline, callOutline, mailOutline, searchOutline, linkOutline, shareSocialOutline } from 'ionicons/icons'; // <--- Nuevos iconos

@Component({
  selector: 'app-lista-pacientes',
  imports: [
    Header, IonContent, IonList, IonItem, IonLabel, IonButton,
    IonIcon, IonAvatar, IonBadge, IonFab, IonFabButton,
    IonToolbar, IonSearchbar, IonFabList
  ],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
})
export class ListaPacientes implements ViewWillEnter {
  pacientes = signal<any[]>([]);
  pacientesFiltrados = signal<any[]>([]);
  loading = signal<boolean>(true);
  busquedaActiva = signal<string>('');
  version = 0;

  private miNutriId = ''; // Guardamos el ID para crear el enlace
  private toastCtrl = inject(ToastController); // Para el mensajito de "Copiado"

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ addOutline, personOutline, callOutline, mailOutline, searchOutline, linkOutline, shareSocialOutline });
  }

  async ionViewWillEnter() {
    this.loading.set(true);
    this.version = new Date().getTime();
    await this.cargarPacientes();

    this.route.queryParams.subscribe(params => {
      const q = params['q'] ?? '';
      this.busquedaActiva.set(q);
      this.aplicarFiltro(q);
    });
  }

  private async cargarPacientes() {
    try {
      this.miNutriId = await this.authService.getNutricionistaId() || '';
      if (!this.miNutriId) { this.loading.set(false); return; }

      const [data] = await Promise.all([
        this.pacientesService.getPacientes(this.miNutriId),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      this.pacientes.set(data || []);
      this.pacientesFiltrados.set(data || []);

    } catch (error) {
      console.error('Error cargando:', error);
    } finally {
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  // 👇 NUEVO MÉTODO PARA COPIAR EL ENLACE 👇
  async copiarEnlaceInvitacion() {
    // Generamos la URL con tu dominio actual (localhost en desarrollo, el real en produccion)
    const urlBase = window.location.origin;
    const enlace = `${urlBase}/registro-paciente?ref=${this.miNutriId}`;

    try {
      await navigator.clipboard.writeText(enlace);
      const toast = await this.toastCtrl.create({
        message: '¡Enlace de invitación copiado! Pégalo en WhatsApp.',
        duration: 3000,
        color: 'success',
        icon: 'checkmark-circle'
      });
      await toast.present();
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }
  
  // Nuevo método para que el searchbar filtre en tiempo real
  onBusqueda(event: any) {
    const query = event.detail.value ?? '';
    this.busquedaActiva.set(query);
    this.aplicarFiltro(query);
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