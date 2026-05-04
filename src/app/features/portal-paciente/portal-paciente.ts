import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAvatar,
  IonItem,
  IonLabel,
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
  ModalController,
} from '@ionic/angular/standalone';
import { Header } from '../../shared/components/header/header';
import { AuthService } from '../../core/services/auth';
import { PacientesService } from '../../core/services/pacientes';
import { PlanNutricionalService } from '../../core/services/plan-nutricional';
import { CitasService, Cita } from '../../core/services/citas';
import { SupabaseService } from '../../core/services/supabase';
import { HabitosTrackerComponent } from './components/habitos-tracker/habitos-tracker';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  mailOutline,
  callOutline,
  chatbubblesOutline,
  calendarOutline,
  waterOutline,
  moonOutline,
  restaurantOutline,
  chevronForwardOutline,
  closeCircle,
  calendarClearOutline,
  videocamOutline,
  locationOutline,
} from 'ionicons/icons';
import { ModalCitaComponent } from '../../shared/components/modal-cita/modal-cita';

/**
 * Componente principal del área del paciente.
 * Reúne la próxima cita, tarjeta del nutricionista a cargo, control de hábitos diarios 
 * e información del menú asignado para hoy.
 *
 * @export
 * @class PortalPaciente
 * @implements {OnInit}
 */
@Component({
  selector: 'app-portal-paciente',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAvatar,
    IonItem,
    IonLabel,
    IonIcon,
    IonButton,
    IonBadge,
    IonList,
    Header,
    HabitosTrackerComponent,
  ],
  templateUrl: './portal-paciente.html',
  styleUrls: ['./portal-paciente.css'],
})
export class PortalPaciente implements OnInit {
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private planService = inject(PlanNutricionalService);
  private citasService = inject(CitasService);
  private supabase = inject(SupabaseService).client;
  private modalCtrl = inject(ModalController);

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

  /**
   * Cálculo computado que filtra del listado completo del menú únicamente los platos
   * (entradasMenu) que correspondan al día de la semana actual.
   */
  menuHoy = computed(() => {
    let diaActual = new Date().getDay();
    if (diaActual === 0) diaActual = 7;
    return this.entradasMenu().filter((e) => e.dia_semana === diaActual);
  });

  /** Interfaz de configuración fija para estructurar las comidas */
  tiposComida = [
    { id: 'desayuno', label: 'Desayuno', icon: '☀️' },
    { id: 'comida', label: 'Almuerzo', icon: '🍽️' },
    { id: 'snack', label: 'Merienda', icon: '🍎' },
    { id: 'cena', label: 'Cena', icon: '🌙' },
  ];

  /** Registra los iconos usados localmente */
  constructor() {
    addIcons({
      personCircleOutline,
      mailOutline,
      callOutline,
      chatbubblesOutline,
      calendarOutline,
      waterOutline,
      moonOutline,
      restaurantOutline,
      chevronForwardOutline,
      closeCircle,
      calendarClearOutline,
      videocamOutline,
      locationOutline,
    });
  }

  /**
   * Evento de inicio del portal del paciente. Carga secuencialmente el perfil,
   * el plan nutricional activo y el historial de hábitos del día presente y establece la próxima cita.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuario();
      if (usuario && usuario.rol === 'paciente') {
        const perfil = await this.pacientesService.getMiPerfilDePaciente(usuario.id);
        this.paciente.set(perfil);
        this.nutricionista.set(perfil?.nutricionista);

        if (perfil) {
          // Cargar Hábitos
          const { data: hab } = await this.supabase
            .from('registro_habitos')
            .select('*')
            .eq('paciente_id', perfil.id)
            .eq('fecha', this.fechaHoy)
            .maybeSingle();
          if (hab) this.habitos.set({ agua: hab.agua, fruta: hab.fruta, sueno: hab.sueno });

          // Cargar Dieta
          const plan = await this.planService.getPlanActivo(perfil.id);
          this.planActivo.set(plan);
          if (plan) {
            const menu = await this.planService.getMenuParaPlan(plan.id);
            if (menu) this.entradasMenu.set(await this.planService.getEntradasMenu(menu.id));
          }

          // Cargar Citas
          const citas = await this.citasService.getCitasPaciente(
            perfil.id,
            perfil.nutricionista?.id, // <-- CORRECCIÓN 1: Accedemos a nutricionista?.id en lugar de nutricionista_id
          );

          // CORRECCIÓN 2: Lógica de fecha para no descartar las citas de hoy que ya han pasado su hora
          const hoyAlInicio = new Date();
          hoyAlInicio.setHours(0, 0, 0, 0);

          this.proximaCita.set(
            citas
              .filter((c) => {
                const fechaCita = new Date(c.fecha_hora);
                return fechaCita >= hoyAlInicio && c.estado !== 'cancelada';
              })
              .sort(
                (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
              )[0] || null,
          );
        }
      }
    } finally {
      this.cargando.set(false);
    }
  }

  /**
   * Refleja los taps o interacciones del usuario en el widget del control de hábitos.
   *
   * @param {{ tipo: string; valor: number }} event - Los datos sobre qué hábito (agua, fruta, sueño)
   * y a qué cantidad ha sido fijado el valor local.
   */
  handleHabitoToggle(event: { tipo: string; valor: number }) {
    const tipo = event.tipo as 'agua' | 'fruta' | 'sueno';
    this.habitos.update((h) => {
      const nuevo = { ...h };
      nuevo[tipo] = nuevo[tipo] === event.valor ? event.valor - 1 : event.valor;
      this.guardarHabitosDB(nuevo);
      return nuevo;
    });
  }

  /**
   * Guarda de forma persistente y asíncrona en base de datos la métrica alterada
   * del tracker de hábitos usando la operación upsert (actualizar o crear si no existía el registro de hoy).
   *
   * @private
   * @param {*} habitosActuales - Array consolidado con las cifras recién estipuladas.
   * @returns {Promise<void>}
   */
  private async guardarHabitosDB(habitosActuales: any) {
    await this.supabase.from('registro_habitos').upsert(
      {
        paciente_id: this.paciente().id,
        fecha: this.fechaHoy,
        agua: habitosActuales.agua,
        fruta: habitosActuales.fruta,
        sueno: habitosActuales.sueno,
      },
      { onConflict: 'paciente_id, fecha' },
    );
  }

  /**
   * Obtiene la receta estipulada para un tipo de comida concreto para el día de hoy (ej. la comida para 'desayuno').
   *
   * @param {string} tipoId - Identificador de string para la hora del plato.
   * @returns {*}
   */
  getEntradaPorTipo(tipoId: string) {
    return this.menuHoy().find((e) => e.tipo_comida === tipoId);
  }

  /** Abre un cuadro modal que muestra la foto completa, los macros y la elaboración de un plato. */
  abrirReceta(r: any) {
    this.recetaSeleccionada.set(r);
    this.modalRecetaAbierto.set(true);
  }

  /** Cierra la pestaña abierta de la receta mostrada y limpia su estado. */
  cerrarReceta() {
    this.modalRecetaAbierto.set(false);
  }

  /**
   * Abre el Modal oficial de la interfaz de la aplicación preconfigurado para que
   * el paciente en cuestión se agende una nueva cita con su nutricionista asignado.
   *
   * @returns {Promise<void>}
   */
  async pedirCita() {
    const p = this.paciente();
    if (!p) return;

    const modal = await this.modalCtrl.create({
      component: ModalCitaComponent,
      componentProps: {
        pacienteId: p.id,
        // Usamos la propiedad del objeto nutricionista cargado
        nutricionistaId: p.nutricionista?.id,
        esPaciente: true,
      },
      breakpoints: [0, 0.85],
      initialBreakpoint: 0.85,
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();
    if (role === 'guardado') {
      this.cargando.set(true);
      await this.ngOnInit(); // Recargamos todo el panel
    }
  }
}