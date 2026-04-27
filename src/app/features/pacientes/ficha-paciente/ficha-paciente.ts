import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { FichaClinicaService } from '../../../core/services/ficha-clinica';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { Header } from '../../../shared/components/header/header';
import { TabResumen } from './tabs/tab-resumen/tab-resumen';
import { TabClinica } from './tabs/tab-clinica/tab-clinica';
import { TabAlimentacion } from './tabs/tab-alimentacion/tab-alimentacion';
import { TabMediciones } from './tabs/tab-mediciones/tab-mediciones';
import { TabPlan } from './tabs/tab-plan/tab-plan';
import { IonContent, IonButton, IonIcon, IonBadge, IonSegment, IonSegmentButton, IonLabel, ToastController, AlertController, IonCard, IonCardContent, IonAvatar, IonItem } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { TabCitas } from './tabs/tab-citas/tab-citas';
import { SupabaseService } from '../../../core/services/supabase';
import {
  arrowBackOutline,
  personCircleOutline,
  medkitOutline,
  restaurantOutline,
  scaleOutline,
  createOutline,
  trashOutline,
  calendarOutline,
  nutritionOutline,
  chatbubblesOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-ficha-paciente',
  imports: [
    Header,
    TabResumen,
    TabClinica,
    TabAlimentacion,
    TabMediciones,
    TabPlan,
    TabCitas,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonAvatar,
    IonItem,
    RouterLink
  ],
  templateUrl: './ficha-paciente.html',
  styleUrls: ['./ficha-paciente.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;
  tabActiva = 'resumen';
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private supabase = this.supabaseService.client;
  @ViewChild(TabResumen) tabResumen!: TabResumen; 

  menuAbierto = false;

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  constructor(
    private pacientesService: PacientesService,
    public fichaClinicaService: FichaClinicaService,
    public cloudinaryService: CloudinaryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
  ) {
    addIcons({
      arrowBackOutline,
      personCircleOutline,
      medkitOutline,
      restaurantOutline,
      scaleOutline,
      createOutline,
      trashOutline,
      nutritionOutline,
      calendarOutline,
      chatbubblesOutline,
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }

    try {
      this.loading = true; // Asegurarnos de que empiece en true

      // Promise.all para garantizar que el aguacate se vea un poco
      const [data] = await Promise.all([
        this.pacientesService.getPacienteById(id),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      this.paciente = data;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  editarDesdeMenu() {
    this.menuAbierto = false;
    this.tabActiva = 'resumen'; // Cambiamos a la pestaña de resumen por si acaso
    setTimeout(() => {
      this.tabResumen.iniciarEdicion(); // Ejecutamos la edición en el hijo
    }, 100);
  }

  onTabChange(event: any) {
    this.tabActiva = event.detail.value;
    this.cdr.detectChanges();
  }

  volver() {
    this.router.navigate(['/pacientes']);
  }

  onPacienteActualizado(pacienteActualizado: any) {
    this.paciente = pacienteActualizado;
    this.cdr.detectChanges();
  }

  async onEliminarPaciente() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar paciente',
      message: `¿Seguro que quieres eliminar a "${this.paciente.usuario?.nombre} ${this.paciente.usuario?.apellidos}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'alert-btn-danger',
          handler: () => this.eliminar(),
        },
      ],
    });
    await alert.present();
  }

  private async eliminar() {
    try {
      await this.pacientesService.eliminarPaciente(this.paciente.id, this.paciente.usuario_id);
      await this.mostrarToast('Paciente eliminado correctamente', 'success');
      this.router.navigate(['/pacientes']);
    } catch (e) {
      console.error(e);
      await this.mostrarToast('Error al eliminar el paciente', 'danger');
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // 1. Obtener o crear el menú base para un plan
  async getOrCreateMenuParaPlan(planId: string, pacienteId: string) {
    // Buscar si ya existe un menú para este plan
    let { data: menu, error } = await this.supabase
      .from('menus_semanales')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle();

    if (error) throw error;

    // Si no existe, lo creamos
    if (!menu) {
      const nutricionistaId = await this.authService.getNutricionistaId();
      const { data: nuevoMenu, error: insertError } = await this.supabase
        .from('menus_semanales')
        .insert({
          plan_id: planId,
          paciente_id: pacienteId,
          nutricionista_id: nutricionistaId,
          semana_inicio: new Date().toISOString().split('T')[0],
          titulo: 'Menú Semanal del Plan'
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      menu = nuevoMenu;
    }

    return menu;
  }

  // 2. Obtener las recetas guardadas en el menú
  async getEntradasMenu(menuId: string) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .select('*, receta:recetas(id, titulo)') // Hacemos join con recetas
      .eq('menu_id', menuId);
    
    if (error) throw error;
    return data || [];
  }

  // 3. Añadir una receta a un día/comida
  async addEntradaMenu(entrada: any) {
    const { data, error } = await this.supabase
      .from('menu_entradas')
      .insert(entrada)
      .select('*, receta:recetas(id, titulo)')
      .single();
      
    if (error) throw error;
    return data;
  }

  // 4. Eliminar una receta del menú
  async deleteEntradaMenu(id: string) {
    const { error } = await this.supabase
      .from('menu_entradas')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
}