import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PacientesService } from '../../../core/services/pacientes';
import { FichaClinicaService } from '../../../core/services/ficha-clinica';
import { CloudinaryService } from '../../../core/services/cloudinary';
import { Header } from '../../../shared/components/header/header';
import { TabResumen } from './tabs/tab-resumen/tab-resumen';
import { TabClinica } from './tabs/tab-clinica/tab-clinica';
import { TabAlimentacion } from './tabs/tab-alimentacion/tab-alimentacion';
import { TabMediciones } from './tabs/tab-mediciones/tab-mediciones';
import { IonContent, IonButton, IonIcon, IonSpinner, IonBadge, IonSegment, IonSegmentButton, IonLabel, ToastController, AlertController, IonCard, IonCardContent, IonAvatar, IonItem } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personCircleOutline,
  medkitOutline,
  restaurantOutline,
  scaleOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-ficha-paciente',
  imports: [
    Header,
    TabResumen,
    TabClinica,
    TabAlimentacion,
    TabMediciones,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonAvatar,
    IonItem
  ],
  templateUrl: './ficha-paciente.html',
  styleUrls: ['./ficha-paciente.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FichaPaciente implements OnInit {
  paciente: any = null;
  loading = true;
  tabActiva = 'resumen';

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
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pacientes']);
      return;
    }
    try {
      this.paciente = await this.pacientesService.getPacienteById(id);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
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
}