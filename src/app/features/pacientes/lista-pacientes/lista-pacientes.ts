import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core'; // ✅ Añadido signal
import { Router } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonAvatar,
  IonBadge,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, personOutline, callOutline, mailOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-pacientes',
  imports: [
    Header,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonSpinner,
    IonAvatar,
    IonBadge,
    IonFab,
    IonFabButton,
  ],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
})
export class ListaPacientes implements OnInit {
  // ✅ Usamos señales para que Angular no se confunda con el origen del cambio
  pacientes = signal<any[]>([]);
  loading = signal<boolean>(true);
  version = 0;

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({ addOutline, personOutline, callOutline, mailOutline });
  }

  ngOnInit() {}

  async ionViewWillEnter() {
    // Al entrar, reseteamos el estado de carga de forma inmediata
    this.loading.set(true);
  }

  async ionViewDidEnter() {
    this.version = new Date().getTime();
    await this.cargarPacientes();
  }

  private async cargarPacientes() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) {
        this.loading.set(false);
        return;
      }

      const data = await this.pacientesService.getPacientes(nutricionistaId);

      // ✅ El uso de Promise.resolve().then() es más prioritario que setTimeout
      // y garantiza que el cambio se procese justo después del chequeo de Angular
      Promise.resolve().then(() => {
        this.pacientes.set(data || []);
        this.loading.set(false);
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Error cargando:', error);
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  verPaciente(id: string) {
    this.router.navigate(['/pacientes', id]);
  }

  nuevoPaciente() {
    this.router.navigate(['/pacientes/nuevo']);
  }

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