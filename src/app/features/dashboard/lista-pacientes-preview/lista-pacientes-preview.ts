import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonList, IonItem, IonLabel, IonAvatar,
  IonButton, IonSkeletonText, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, calendarOutline, chevronForwardOutline, peopleOutline } from 'ionicons/icons';
import { PacientesService } from '../../../core/services/pacientes';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-lista-pacientes-preview',
  imports: [
    CommonModule, IonSkeletonText, IonIcon, 
  ],
  templateUrl: './lista-pacientes-preview.html',
  styleUrl: './lista-pacientes-preview.css'
})
export class ListaPacientesPreviewComponent implements OnInit {
  pacientes: any[] = [];
  cargando = true;
  readonly LIMITE = 5;

  constructor(
    private pacientesService: PacientesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ arrowForwardOutline, peopleOutline, chevronForwardOutline, calendarOutline});
  }

  async ngOnInit() {
    await this.cargarPacientes();
  }

  private async cargarPacientes() {
    try {
      const nutricionistaId = await this.authService.getNutricionistaId();
      if (!nutricionistaId) return;
      this.pacientes = await this.pacientesService.getPacientesPreview(nutricionistaId, this.LIMITE);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  irAFicha(pacienteId: string) {
    this.router.navigate(['/pacientes', pacienteId]);
  }

  verTodos() {
    this.router.navigate(['/pacientes']);
  }
}