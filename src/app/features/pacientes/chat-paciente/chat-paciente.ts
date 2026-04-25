import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';
import { ChatService, Mensaje } from '../../../core/services/chat';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-chat-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonItem, IonInput, IonButton, IonIcon, IonButtons, IonBackButton],
  templateUrl: './chat-paciente.html',
  styleUrls: ['./chat-paciente.css']
})
export class ChatPaciente implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  pacienteId = '';
  chatId = '';
  miUsuarioId = '';
  
  mensajes = signal<Mensaje[]>([]);
  nuevoMensaje = '';
  cargando = true;
  
  private realtimeChannel: any;

  constructor() {
    addIcons({ sendOutline });
  }

  async ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id') || '';
    this.miUsuarioId = await this.authService.getUsuarioId();
    const nutricionistaId = await this.authService.getNutricionistaId();

    if (nutricionistaId && this.pacienteId) {
      // Obtenemos la sala
      const chat = await this.chatService.getOrCreateChat(nutricionistaId, this.pacienteId);
      this.chatId = chat.id;

      // Cargamos el historial
      const historial = await this.chatService.getMensajes(this.chatId);
      this.mensajes.set(historial);
      
      // Nos suscribimos para escuchar en tiempo real
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
    this.nuevoMensaje = ''; // Limpiar el input rápido para UX

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