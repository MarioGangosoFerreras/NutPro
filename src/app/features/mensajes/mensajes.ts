// src/app/features/mensajes/mensajes.ts
import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonSearchbar, IonIcon, IonAvatar, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, personCircleOutline, searchOutline, chatbubblesOutline, arrowBackOutline } from 'ionicons/icons';
import { ChatService, Mensaje } from '../../core/services/chat';
import { AuthService } from '../../core/services/auth';
import { PacientesService } from '../../core/services/pacientes';
import { Header } from '../../shared/components/header/header';

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonSearchbar, IonIcon, IonAvatar, IonButton, Header],
  templateUrl: './mensajes.html',
  styleUrls: ['./mensajes.css']
})
export class Mensajes implements OnInit, OnDestroy {
  @ViewChild('chatScroll') chatScroll!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  miUsuarioId = '';
  nutricionistaId = '';
  
  contactos = signal<any[]>([]);
  contactosFiltrados = signal<any[]>([]);
  busquedaQuery = signal('');

  contactoActivo = signal<any>(null);
  chatIdActivo = '';
  mensajes = signal<Mensaje[]>([]);
  nuevoMensaje = '';
  
  private realtimeChannel: any;

  constructor() {
    addIcons({ sendOutline, personCircleOutline, searchOutline, chatbubblesOutline, arrowBackOutline });
  }

  async ngOnInit() {
    this.miUsuarioId = await this.authService.getUsuarioId();
    this.nutricionistaId = await this.authService.getNutricionistaId() || '';

    if (this.nutricionistaId) {
      await this.cargarContactos();
    }

    const pacienteIdParam = this.route.snapshot.queryParamMap.get('pacienteId');
    if (pacienteIdParam) {
       const contacto = this.contactos().find(c => c.paciente.id === pacienteIdParam);
       if (contacto) this.seleccionarContacto(contacto);
    }
  }

  async cargarContactos() {
    const pacientes = await this.pacientesService.getPacientes(this.nutricionistaId);
    const chats = await this.chatService.getChatsNutricionista(this.nutricionistaId);
    
    const contactosMap = pacientes.map((p: any) => {
      const chat = chats.find((c: any) => c.paciente.id === p.id);
      return {
        paciente: p,
        ultimoMensaje: chat?.ultimo_mensaje?.[0] || null,
        chatId: chat?.id || null
      };
    });

    contactosMap.sort((a, b) => {
      const dateA = a.ultimoMensaje?.enviado_at ? new Date(a.ultimoMensaje.enviado_at).getTime() : 0;
      const dateB = b.ultimoMensaje?.enviado_at ? new Date(b.ultimoMensaje.enviado_at).getTime() : 0;
      return dateB - dateA;
    });

    this.contactos.set(contactosMap);
    this.contactosFiltrados.set(contactosMap);
  }

  onBuscar(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.busquedaQuery.set(query);
    if (!query) {
      this.contactosFiltrados.set(this.contactos());
      return;
    }
    const filtrados = this.contactos().filter(c => {
      const nombreCompleto = `${c.paciente.usuario?.nombre} ${c.paciente.usuario?.apellidos}`.toLowerCase();
      return nombreCompleto.includes(query);
    });
    this.contactosFiltrados.set(filtrados);
  }

  async seleccionarContacto(contacto: any) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.contactoActivo.set(contacto);
    this.mensajes.set([]);
    
    const chat = await this.chatService.getOrCreateChat(this.nutricionistaId, contacto.paciente.id);
    this.chatIdActivo = chat.id;

    await this.chatService.marcarComoLeidos(this.chatIdActivo, this.miUsuarioId);

    const historial = await this.chatService.getMensajes(this.chatIdActivo);
    this.mensajes.set(historial);

    this.realtimeChannel = this.chatService.suscribirMensajes(this.chatIdActivo, (msg) => {
      this.mensajes.update(msgs => [...msgs, msg]);
      if (msg.sender_id !== this.miUsuarioId) {
         this.chatService.marcarComoLeidos(this.chatIdActivo, this.miUsuarioId);
      }
      this.scrollToBottom();
      this.cdr.detectChanges();
    });

    this.scrollToBottom();
  }

  async enviar() {
    if (!this.nuevoMensaje.trim() || !this.chatIdActivo) return;

    const texto = this.nuevoMensaje.trim();
    this.nuevoMensaje = '';

    try {
      await this.chatService.enviarMensaje(this.chatIdActivo, this.miUsuarioId, texto);
      this.scrollToBottom();
      this.actualizarUltimoMensajeLista(texto);
    } catch (e) {
      console.error('Error enviando mensaje', e);
    }
  }
  
  actualizarUltimoMensajeLista(texto: string) {
     const current = this.contactoActivo();
     if(!current) return;
     
     const updated = this.contactos().map(c => {
        if(c.paciente.id === current.paciente.id) {
           return { ...c, ultimoMensaje: { contenido: texto, enviado_at: new Date().toISOString() } };
        }
        return c;
     });
     this.contactos.set(updated);
     this.onBuscar({ detail: { value: this.busquedaQuery() } });
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatScroll && this.chatScroll.nativeElement) {
        this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }
}