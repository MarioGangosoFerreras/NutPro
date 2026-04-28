import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonSpinner,
  IonBadge,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { Header } from '../../../../shared/components/header/header';
import { AuthService } from '../../../../core/services/auth';
import { PacientesService } from '../../../../core/services/pacientes';
import { PlanNutricionalService } from '../../../../core/services/plan-nutricional';
import { PdfService } from '../../../../core/services/pdf';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  restaurantOutline,
  flameOutline,
  closeCircle,
  chevronForwardOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-mi-plan',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton,
    IonSpinner,
    IonBadge,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonList,
    IonItem,
    IonLabel,
    Header,
  ],
  templateUrl: './mi-plan.html',
  styleUrls: ['./mi-plan.css'],
})
export class MiPlan implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private planService = inject(PlanNutricionalService);
  private pdfService = inject(PdfService);

  paciente = signal<any>(null);
  planActivo = signal<any>(null);
  menuActivo = signal<any>(null);
  entradasMenu = signal<any[]>([]);
  cargando = signal(true);

  modalRecetaAbierto = signal(false);
  recetaSeleccionada = signal<any>(null);

  dias = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 7, nombre: 'Domingo' },
  ];
  tiposComida = [
    { id: 'desayuno', label: 'Desayuno', icon: '☀️' },
    { id: 'comida', label: 'Almuerzo', icon: '🍽️' },
    { id: 'snack', label: 'Merienda', icon: '🍎' },
    { id: 'cena', label: 'Cena', icon: '🌙' },
  ];

  constructor() {
    addIcons({
      downloadOutline,
      restaurantOutline,
      flameOutline,
      closeCircle,
      chevronForwardOutline,
    });
  }

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario) {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
        if (perfil) {
          const plan = await this.planService.getPlanActivo(perfil.id);
          this.planActivo.set(plan);
          if (plan) {
            const menu = await this.planService.getMenuParaPlan(plan.id);
            if (menu) {
              this.menuActivo.set(menu);
              const entradas = await this.planService.getEntradasMenu(menu.id);
              this.entradasMenu.set(entradas);
            }
          }
        }
      }
    } finally {
      this.cargando.set(false);
    }
  }

  obtenerEntradas(diaId: number, tipoComida: string) {
    return this.entradasMenu().filter(
      (e) => e.dia_semana === diaId && e.tipo_comida === tipoComida,
    );
  }

  async exportarPDF() {
    if (!this.paciente() || !this.planActivo()) return;
    this.cargando.set(true);
    try {
      await this.pdfService.exportarMenuSemanal(
        this.paciente(),
        this.planActivo(),
        this.entradasMenu(),
      );
    } finally {
      this.cargando.set(false);
    }
  }

  abrirReceta(r: any) {
    this.recetaSeleccionada.set(r);
    this.modalRecetaAbierto.set(true);
  }
  cerrarReceta() {
    this.modalRecetaAbierto.set(false);
    setTimeout(() => this.recetaSeleccionada.set(null), 300);
  }
}
