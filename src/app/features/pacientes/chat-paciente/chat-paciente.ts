import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonInput,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonAvatar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, personCircleOutline } from 'ionicons/icons';
import { ChatService, Mensaje } from '../../../core/services/chat';
import { AuthService } from '../../../core/services/auth';
import { PacientesService } from '../../../core/services/pacientes';

@Component({
  selector: 'app-chat-paciente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonInput,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonAvatar,
    RouterLink,
  ],
  templateUrl: './chat-paciente.html',
  styleUrls: ['./chat-paciente.css'],
})
export class ChatPaciente implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  pacienteId = '';
  chatId = '';
  miUsuarioId = '';

  paciente = signal<any>(null);
  mensajes = signal<Mensaje[]>([]);
  nuevoMensaje = '';
  cargando = true;

  private realtimeChannel: any;

  constructor() {
    addIcons({ sendOutline, personCircleOutline });
  }

  async ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id') || '';
    this.miUsuarioId = await this.authService.getUsuarioId();
    const nutricionistaId = await this.authService.getNutricionistaId();

    if (this.pacienteId) {
      const datosPaciente = await this.pacientesService.getPacienteById(this.pacienteId);
      this.paciente.set(datosPaciente);
    }

    if (nutricionistaId && this.pacienteId) {
      const chat = await this.chatService.getOrCreateChat(nutricionistaId, this.pacienteId);
      this.chatId = chat.id;

      // NUEVO: Marcar mensajes como leídos y actualizar la burbuja del menú lateral
      await this.chatService.marcarComoLeidos(this.chatId, this.miUsuarioId);
      this.chatService.actualizarContadorBadge(this.miUsuarioId, 'nutricionista');

      const historial = await this.chatService.getMensajes(this.chatId);
      this.mensajes.set(historial);

      this.realtimeChannel = this.chatService.suscribirMensajes(this.chatId, (msg) => {
        this.mensajes.update((msgs) => [...msgs, msg]);

        // Si el paciente escribe, lo marcamos leído al instante
        if (msg.sender_id !== this.miUsuarioId) {
          this.chatService.marcarComoLeidos(this.chatId, this.miUsuarioId);
          this.chatService.actualizarContadorBadge(this.miUsuarioId, 'nutricionista');
        }

        this.scrollToBottom();
        this.cdr.detectChanges();
      });

      this.cargando = false;
      this.scrollToBottom();
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  async enviar() {
    if (!this.nuevoMensaje.trim() || !this.chatId) return;

    const texto = this.nuevoMensaje.trim();
    this.nuevoMensaje = '';

    try {
      await this.chatService.enviarMensaje(this.chatId, this.miUsuarioId, texto);
      this.scrollToBottom();
    } catch (e) {
      console.error('Error enviando mensaje', e);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }
}
