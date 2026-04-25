import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router'; // <-- Añadido RouterLink
import { IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton, IonAvatar } from '@ionic/angular/standalone'; // <-- Añadido IonAvatar
import { addIcons } from 'ionicons';
import { sendOutline, personCircleOutline } from 'ionicons/icons'; // <-- Añadido icono
import { ChatService, Mensaje } from '../../../core/services/chat';
import { AuthService } from '../../../core/services/auth';
import { PacientesService } from '../../../core/services/pacientes'; // <-- Añadido servicio

@Component({
  selector: 'app-chat-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton, IonAvatar, RouterLink], // <-- Añadidos al array
  templateUrl: './chat-paciente.html',
  styleUrls: ['./chat-paciente.css']
})
export class ChatPaciente implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService); // <-- Inyectamos servicio
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  pacienteId = '';
  chatId = '';
  miUsuarioId = '';
  
  paciente = signal<any>(null); // <-- Guardará los datos del paciente
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
      // 1. Cargamos los datos del paciente para la cabecera
      const datosPaciente = await this.pacientesService.getPacienteById(this.pacienteId);
      this.paciente.set(datosPaciente);
    }

    if (nutricionistaId && this.pacienteId) {
      // 2. Obtenemos la sala
      const chat = await this.chatService.getOrCreateChat(nutricionistaId, this.pacienteId);
      this.chatId = chat.id;

      // 3. Cargamos el historial
      const historial = await this.chatService.getMensajes(this.chatId);
      this.mensajes.set(historial);
      
      // 4. Nos suscribimos para escuchar en tiempo real
      this.realtimeChannel = this.chatService.suscribirMensajes(this.chatId, (msg) => {
        this.mensajes.update(msgs => [...msgs, msg]);
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