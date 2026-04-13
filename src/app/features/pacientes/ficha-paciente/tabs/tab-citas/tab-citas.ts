import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircleOutline, listOutline, calendarOutline } from 'ionicons/icons';
import { CitasService, Cita } from '../../../../../core/services/citas';
import { CitasLista } from './citas-lista/citas-lista';
import { CitasCalendario } from './citas-calendario/citas-calendario';
import { ModalCitaComponent } from '../../../../../shared/components/modal-cita/modal-cita';
import { AuthService } from '../../../../../core/services/auth';
import { 
  IonSegment, 
  IonSegmentButton, 
  IonLabel, 
  IonIcon, 
  IonButton,
  IonSpinner,
  ModalController, 
  AlertController 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab-citas',
  standalone: true,
  imports: [
    CommonModule, 
    IonSegment, 
    IonSegmentButton, 
    IonLabel,
    IonIcon, 
    IonButton,
    IonSpinner,
    CitasLista, 
    CitasCalendario
  ],
  templateUrl: './tab-citas.html',
})
export class TabCitas implements OnInit {
  @Input() pacienteId!: string;
  @Input() nutricionistaId!: string;

  private citasService = inject(CitasService);
  private authService  = inject(AuthService);
  private modalCtrl    = inject(ModalController);
  private alertCtrl    = inject(AlertController);

  vistaActiva: 'lista' | 'calendario' = 'lista';
  citas: Cita[] = [];
  cargando = true;

  constructor() {
    addIcons({ addCircleOutline, listOutline, calendarOutline });
  }

  private cdr = inject(ChangeDetectorRef);
  
  async ngOnInit() {
    await this.cargarCitas();
    this.cdr.detectChanges();
  }

  onVistaChange(e: any) {
    this.vistaActiva = e.detail.value;
    this.cdr.detectChanges();
  }

  async cargarCitas() {
    this.cargando = true;
    try {
      this.citas = await this.citasService.getCitasPaciente(
        this.pacienteId, this.nutricionistaId
      );
      this.citas = [...this.citas];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async abrirModal(cita?: Cita) {
    const modal = await this.modalCtrl.create({
      component: ModalCitaComponent,
      componentProps: { cita, pacienteId: this.pacienteId, nutricionistaId: this.nutricionistaId }
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'guardado') await this.cargarCitas();
  }

  async confirmar(cita: Cita) {
    await this.citasService.confirmarCita(cita.id!);
    await this.cargarCitas();
  }

  async cancelar(cita: Cita) {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar cita',
      message: '¿Seguro que quieres cancelar esta cita?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí', role: 'confirm', handler: async () => {
          const userId = await this.authService.getUserId();
          await this.citasService.cancelarCita(cita.id!, userId);
          await this.cargarCitas();
        }}
      ]
    });
    await alert.present();
  }

  async eliminar(cita: Cita) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cita',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
          await this.citasService.eliminarCita(cita.id!);
          await this.cargarCitas();
        }}
      ]
    });
    await alert.present();
  }
}