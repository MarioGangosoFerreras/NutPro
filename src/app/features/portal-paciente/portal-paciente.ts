import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonAvatar, IonItem, IonLabel, IonIcon, IonButton, IonSpinner, IonBadge, 
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonList 
} from '@ionic/angular/standalone';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/services/auth';
import { PacientesService } from '../../core/services/pacientes';
import { PlanNutricionalService } from '../../core/services/plan-nutricional';
import { CitasService, Cita } from '../../core/services/citas';
import { SupabaseService } from '../../core/services/supabase';
import { HabitosTrackerComponent } from './components/habitos-tracker/habitos-tracker'; // <-- IMPORT
import { addIcons } from 'ionicons';
import { 
  personCircleOutline, mailOutline, callOutline, chatbubblesOutline, 
  calendarOutline, waterOutline, moonOutline, restaurantOutline, 
  chevronForwardOutline, closeCircle, calendarClearOutline,
  videocamOutline, locationOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-portal-paciente',
  standalone: true,
  imports: [
    CommonModule, RouterLink, IonContent, IonCard, IonCardHeader, IonCardTitle, 
    IonCardContent, IonAvatar, IonItem, IonLabel, IonIcon, IonButton, 
    IonSpinner, IonBadge, IonModal, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonList, Header, HabitosTrackerComponent // <-- AÑADIR
  ],
  templateUrl: './portal-paciente.html',
  styleUrls: ['./portal-paciente.css']
})
export class PortalPaciente implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private planService = inject(PlanNutricionalService);
  private citasService = inject(CitasService);
  private supabase = inject(SupabaseService).client;

  paciente = signal<any>(null);
  nutricionista = signal<any>(null);
  proximaCita = signal<Cita | null>(null);
  
  planActivo = signal<any>(null);
  entradasMenu = signal<any[]>([]);
  cargando = signal(true);
  fechaHoy = new Date().toISOString().split('T')[0];

  habitos = signal({ agua: 0, fruta: 0, sueno: 7 });
  modalRecetaAbierto = signal(false);
  recetaSeleccionada = signal<any>(null);

  menuHoy = computed(() => {
    let diaActual = new Date().getDay();
    if (diaActual === 0) diaActual = 7;
    return this.entradasMenu().filter(e => e.dia_semana === diaActual);
  });

  tiposComida = [
    { id: 'desayuno', label: 'Desayuno', icon: '☀️' },
    { id: 'comida', label: 'Almuerzo', icon: '🍽️' },
    { id: 'snack', label: 'Merienda', icon: '🍎' },
    { id: 'cena', label: 'Cena', icon: '🌙' }
  ];

  constructor() {
    addIcons({ 
      personCircleOutline, mailOutline, callOutline, chatbubblesOutline, 
      calendarOutline, waterOutline, moonOutline, restaurantOutline, 
      chevronForwardOutline, closeCircle, calendarClearOutline,
      videocamOutline, locationOutline
    });
  }

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario && usuario.rol === 'paciente') {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
        this.nutricionista.set(perfil?.nutricionista);

        if (perfil) {
          // Cargar Hábitos
          const { data: hab } = await this.supabase.from('registro_habitos').select('*').eq('paciente_id', perfil.id).eq('fecha', this.fechaHoy).maybeSingle();
          if (hab) this.habitos.set({ agua: hab.agua, fruta: hab.fruta, sueno: hab.sueno });

          // Cargar Dieta
          const plan = await this.planService.getPlanActivo(perfil.id);
          this.planActivo.set(plan);
          if (plan) {
            const menu = await this.planService.getMenuParaPlan(plan.id);
            if (menu) this.entradasMenu.set(await this.planService.getEntradasMenu(menu.id));
          }

          // Cargar Cita
          const citas = await this.citasService.getCitasPaciente(perfil.id, perfil.nutricionista_id);
          this.proximaCita.set(citas.filter(c => new Date(c.fecha_hora) > new Date() && c.estado !== 'cancelada')
            .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())[0] || null);
        }
      }
    } finally {
      this.cargando.set(false);
    }
  }

  handleHabitoToggle(event: {tipo: string, valor: number}) {
    const tipo = event.tipo as 'agua' | 'fruta' | 'sueno';
    this.habitos.update(h => {
      const nuevo = { ...h };
      nuevo[tipo] = nuevo[tipo] === event.valor ? event.valor - 1 : event.valor;
      this.guardarHabitosDB(nuevo);
      return nuevo;
    });
  }

  private async guardarHabitosDB(habitosActuales: any) {
    await this.supabase.from('registro_habitos').upsert({
      paciente_id: this.paciente().id,
      fecha: this.fechaHoy,
      agua: habitosActuales.agua,
      fruta: habitosActuales.fruta,
      sueno: habitosActuales.sueno
    }, { onConflict: 'paciente_id, fecha' });
  }

  getEntradaPorTipo(tipoId: string) { return this.menuHoy().find(e => e.tipo_comida === tipoId); }
  abrirReceta(r: any) { this.recetaSeleccionada.set(r); this.modalRecetaAbierto.set(true); }
  cerrarReceta() { this.modalRecetaAbierto.set(false); }
}