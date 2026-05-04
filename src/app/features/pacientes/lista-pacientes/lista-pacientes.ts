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

/**
 * Vista general de pacientes asociados a un nutricionista.
 * Permite buscar, ver, o registrar nuevos pacientes de forma manual 
 * y copiar enlaces de invitación para el autorregistro.
 *
 * @export
 * @class ListaPacientes
 * @implements {ViewWillEnter}
 */
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

  /**
   * Constructor de la clase que inicializa las dependencias y añade los iconos de Ionic utilizados.
   *
   * @param {PacientesService} pacientesService - Servicio para consultar pacientes en la base de datos.
   * @param {AuthService} authService - Servicio de autenticación.
   * @param {Router} router - Manejador de enrutamiento principal.
   * @param {ActivatedRoute} route - Información sobre la ruta y parámetros actuales.
   * @param {ChangeDetectorRef} cdr - Controlador de detección de cambios en el template.
   */
  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ addOutline, personOutline, callOutline, mailOutline, searchOutline, linkOutline, shareSocialOutline });
  }

  /**
   * Evento del ciclo de vida de Ionic. Se dispara justo antes de que la vista se haga activa.
   * Refresca la lista de pacientes y aplica cualquier filtro proveniente de queryParams de la URL.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Llama al servicio correspondiente para traer la lista completa de pacientes
   * asignados al nutricionista conectado actualmente.
   *
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * Genera un enlace de invitación único para que el paciente se registre por sí mismo,
   * copiándolo directamente al portapapeles del dispositivo y avisando al usuario con un Toast.
   *
   * @returns {Promise<void>}
   */
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
  
  /**
   * Función activada al modificar el texto en la barra de búsqueda de la interfaz. 
   * Filtra los pacientes mostrados dinámicamente.
   *
   * @param {*} event - Objeto del evento Searchbar de Ionic.
   */
  // Nuevo método para que el searchbar filtre en tiempo real
  onBusqueda(event: any) {
    const query = event.detail.value ?? '';
    this.busquedaActiva.set(query);
    this.aplicarFiltro(query);
  }

  /**
   * Ejecuta el filtro evaluando nombre, email o teléfono sobre el array original de pacientes
   * y actualiza la señal de pacientes filtrados.
   *
   * @private
   * @param {string} query - Cadena de texto a buscar.
   */
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

  /**
   * Resetea el buscador de pacientes y la URL, eliminando los parámetros de búsqueda.
   */
  limpiarBusqueda() {
    this.busquedaActiva.set('');
    this.router.navigate(['/pacientes']);
  }

  /**
   * Navega a la vista de detalle clínico (ficha completa) de un paciente.
   * * @param {string} id - Identificador del paciente.
   */
  verPaciente(id: string) { this.router.navigate(['/pacientes', id]); }
  
  /** * Navega a la vista de creación manual de un nuevo paciente. 
   */
  nuevoPaciente() { this.router.navigate(['/pacientes/nuevo']); }

  /**
   * Calcula la edad cronológica actual en años a partir de una fecha de nacimiento.
   *
   * @param {string} fechaNacimiento - Fecha de nacimiento en formato YYYY-MM-DD.
   * @returns {number} Años cumplidos que tiene la persona en el día de hoy.
   */
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