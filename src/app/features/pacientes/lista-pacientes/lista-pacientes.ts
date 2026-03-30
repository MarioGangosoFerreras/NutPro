import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton,
  IonIcon, IonSpinner, IonText, IonAvatar, IonBadge,
  IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, personOutline, callOutline, mailOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-pacientes',
  imports: [
    Header,
    IonContent, IonList, IonItem, IonLabel, IonButton,
    IonIcon, IonSpinner, IonText, IonAvatar, IonBadge,
    IonFab, IonFabButton
  ],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css'
})
export class ListaPacientes implements OnInit {
  pacientes: any[] = [];
  loading = true;

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef  // ✅ añadido
  ) {
    addIcons({ addOutline, personOutline, callOutline, mailOutline });
  }

  async ngOnInit() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();

      if (!nutricionistaId) {
        console.error('No se encontró nutricionista');
        return;
      }

      this.pacientes = await this.pacientesService.getPacientes(nutricionistaId);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();  // ✅ fuerza actualización de la vista
    }
  }

  verPaciente(id: string) {
    this.router.navigate(['/pacientes', id]);
  }

  nuevoPaciente() {
    this.router.navigate(['/pacientes/nuevo']);
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }
}