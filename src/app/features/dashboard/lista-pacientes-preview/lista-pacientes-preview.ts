import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonButton,
  IonSkeletonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  calendarOutline,
  chevronForwardOutline,
  locationOutline,
  peopleOutline,
  videocamOutline,
} from 'ionicons/icons';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-lista-pacientes-preview',
  imports: [CommonModule, IonSkeletonText, IonIcon],
  templateUrl: './lista-pacientes-preview.html',
  styleUrl: './lista-pacientes-preview.css',
})
export class ListaPacientesPreviewComponent implements OnInit, OnDestroy {
  pacientes: any[] = [];
  cargando = true;
  readonly LIMITE = 5;
  private citaSub: any; // Para guardar la suscripción

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {
    addIcons({ arrowForwardOutline, peopleOutline, chevronForwardOutline, calendarOutline, locationOutline, videocamOutline});
  }

  async ngOnInit() {
    await this.cargarPacientes();
    this.escucharCambios();
  }

  // CONFIGURACIÓN REALTIME
  private escucharCambios() {
  this.citaSub = this.pacientesService.supabaseClient
    .channel(`citas-preview-${Date.now()}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'citas' }, 
      (payload) => {
        console.log('🔔 Realtime recibido:', payload); // ← añade esto
        this.ngZone.run(() => this.cargarPacientes());
      }
    )
    .subscribe((status) => {
      console.log('📡 Estado canal preview:', status); // ← y esto
    });
}

  private async cargarPacientes() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) return;

      const nuevosDatos = await this.pacientesService.getPacientesPreview(
        nutricionistaId,
        this.LIMITE,
      );

      this.pacientes = [...nuevosDatos];
    } catch (error) {
      console.error('Error al recargar:', error);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    // Limpieza vital para evitar fugas de memoria
    this.pacientesService.desuscribirCitas(this.citaSub);
  }

  irAFicha(pacienteId: string) {
    this.router.navigate(['/pacientes', pacienteId]);
  }

  verTodos() {
    this.router.navigate(['/pacientes']);
  }

  esHoy(fecha: string): boolean {
    const hoy = new Date().toDateString();
    const fechaCita = new Date(fecha).toDateString();
    return hoy === fechaCita;
  }
}
