import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { Header } from '../../../shared/components/header/header';
import {
  IonContent, IonButton, IonIcon, IonSpinner,
  IonBadge, IonAvatar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personCircleOutline, calendarOutline, callOutline, mailOutline, locationOutline } from 'ionicons/icons';

@Component({
  selector: 'app-ficha-paciente',
  imports: [
    RouterLink, Header,
    IonContent, IonButton, IonIcon, IonSpinner, IonBadge, IonAvatar
  ],
  templateUrl: './ficha-paciente.html',
  styleUrl: './ficha-paciente.css'
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;

  constructor(
    private pacientesService: PacientesService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ arrowBackOutline, personCircleOutline, calendarOutline, callOutline, mailOutline, locationOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }

    try {
      this.paciente = await this.pacientesService.getPacienteById(id);
    } catch (error) {
      console.error('Error cargando paciente:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }

  volver() {
    this.router.navigate(['/pacientes']);
  }
}