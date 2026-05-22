import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonSearchbar, IonIcon, IonAvatar, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sendOutline,
  personCircleOutline,
  searchOutline,
  chatbubblesOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { ChatService, Mensaje } from '../../core/services/chat';
import { AuthService } from '../../core/services/auth';
import { PacientesService } from '../../core/services/pacientes';
import { SupabaseService } from '../../core/services/supabase';
import { Header } from '../../shared/components/header/header';

/**
 * Componente principal del módulo de mensajería (tipo WhatsApp Web).
 * Permite tanto a nutricionistas como a pacientes comunicarse en tiempo real
 * a través de un panel dividido (lista de contactos y sala de chat).
 *
 * @export
 * @class Mensajes
 * @implements {OnInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonSearchbar,
    IonIcon,
    IonAvatar,
    IonButton,
    Header,
  ],
  templateUrl: './mensajes.html',
  styleUrls: ['./mensajes.css'],
})
export class Mensajes implements OnInit, OnDestroy {
  /** Referencia al elemento del contenedor de mensajes para forzar el scroll inferior */
  @ViewChild('chatScroll') chatScroll!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private pacientesService = inject(PacientesService);
  private supabase = inject(SupabaseService).client;
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  miUsuarioId = '';
  nutricionistaId = '';
  miPacienteId = '';
  rol = '';

  /** Lista reactiva con todos los contactos (chats) disponibles */
  contactos = signal<any[]>([]);
  /** Lista reactiva de los contactos tras aplicar filtros de búsqueda */
  contactosFiltrados = signal<any[]>([]);
  /** Término de búsqueda actualmente introducido en el buscador */
  busquedaQuery = signal('');

  /** Información del contacto que el usuario tiene abierto en el panel derecho */
  contactoActivo = signal<any>(null);
  /** Identificador único del chat abierto actualmente */
  chatIdActivo = '';
  /** Array reactivo de los mensajes dentro del chat activo */
  mensajes = signal<Mensaje[]>([]);
  /** Texto enlazado al input del nuevo mensaje a enviar */
  nuevoMensaje = '';

  /** Referencia a la suscripción del canal de mensajes en tiempo real para el chat activo */
  private realtimeChannel: any;
  /** Referencia a la suscripción en tiempo real para mantener actualizada la lista de contactos */
  private listChannel: any;

  /**
   * Crea una instancia de Mensajes y registra los iconos de Ionic utilizados.
   */
  constructor() {
    addIcons({
      sendOutline,
      personCircleOutline,
      searchOutline,
      chatbubblesOutline,
      arrowBackOutline,
    });
  }

  /**
   * Método de ciclo de vida de Angular. Inicializa el componente.
   * Determina el rol del usuario, carga la lista de contactos correspondiente
   * y se suscribe a los cambios globales para actualizar las notificaciones en la lista.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    if (!usuario) return;

    this.miUsuarioId = usuario.id;
    this.rol = usuario.rol;

    if (this.rol === 'nutricionista') {
      this.nutricionistaId = (await this.authService.getNutricionistaId()) || '';
      if (this.nutricionistaId) {
        await this.cargarContactosNutricionista();
      }
    } else if (this.rol === 'paciente') {
      await this.cargarContactoNutricionista();
    }

    const pacienteIdParam = this.route.snapshot.queryParamMap.get('pacienteId');
    if (pacienteIdParam) {
      const contacto = this.contactos().find((c) => c.pacienteId === pacienteIdParam);
      if (contacto) this.seleccionarContacto(contacto);
    }

    this.listChannel = this.supabase
      .channel('mensajes-list-update')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes' },
        (payload) => {
          const newMsg = payload.new as Mensaje;

          this.contactos.update((list) => {
            let updated = false;
            const newList = list.map((c) => {
              if (c.chatId === newMsg.chat_id) {
                updated = true;
                const isActivo = this.chatIdActivo === newMsg.chat_id;
                const isMine = newMsg.sender_id === this.miUsuarioId;

                return {
                  ...c,
                  ultimoMensaje: newMsg,
                  unreadCount: !isActivo && !isMine ? (c.unreadCount || 0) + 1 : c.unreadCount,
                };
              }
              return c;
            });

            if (updated) {
              newList.sort((a, b) => {
                const dateA = a.ultimoMensaje?.enviado_at
                  ? new Date(a.ultimoMensaje.enviado_at).getTime()
                  : 0;
                const dateB = b.ultimoMensaje?.enviado_at
                  ? new Date(b.ultimoMensaje.enviado_at).getTime()
                  : 0;
                return dateB - dateA;
              });
            }
            return newList;
          });

          this.onBuscar({ detail: { value: this.busquedaQuery() } });
        },
      )
      .subscribe();
  }

  /**
   * Carga la lista de pacientes con los que el nutricionista puede hablar, 
   * obteniendo simultáneamente el último mensaje y el contador de no leídos de cada chat.
   *
   * @returns {Promise<void>}
   */
  async cargarContactosNutricionista() {
    const pacientes = await this.pacientesService.getPacientes(this.nutricionistaId);
    const chats = await this.chatService.getChatsNutricionista(this.nutricionistaId);

    const chatIds = chats.map((c: any) => c.id).filter((id: any) => id);
    const unreadMap = await this.chatService.getUnreadCountsPerChat(chatIds, this.miUsuarioId);

    const contactosMap = pacientes.map((p: any) => {
      const chat = chats.find((c: any) => c.paciente.id === p.id);
      return {
        idUnico: p.id,
        pacienteId: p.id,
        nutricionistaId: this.nutricionistaId,
        usuario: p.usuario,
        ultimoMensaje: chat?.ultimo_mensaje?.[0] || null,
        chatId: chat?.id || null,
        unreadCount: chat?.id ? unreadMap[chat.id] || 0 : 0,
      };
    });

    contactosMap.sort((a, b) => {
      const dateA = a.ultimoMensaje?.enviado_at
        ? new Date(a.ultimoMensaje.enviado_at).getTime()
        : 0;
      const dateB = b.ultimoMensaje?.enviado_at
        ? new Date(b.ultimoMensaje.enviado_at).getTime()
        : 0;
      return dateB - dateA;
    });

    this.contactos.set(contactosMap);
    this.contactosFiltrados.set(contactosMap);
  }

  /**
   * Carga el perfil del nutricionista asignado al paciente para crear el único
   * contacto disponible en la vista de mensajes del paciente.
   *
   * @returns {Promise<void>}
   */
  async cargarContactoNutricionista() {
    const miPerfil = await this.pacientesService.getMiPerfilDePaciente(this.miUsuarioId);
    if (!miPerfil || !miPerfil.nutricionista) return;

    this.miPacienteId = miPerfil.id;
    this.nutricionistaId = miPerfil.nutricionista.id;

    const chat = await this.chatService.getOrCreateChat(this.nutricionistaId, this.miPacienteId);
    const historial = await this.chatService.getMensajes(chat.id);
    const ultimoMensaje = historial.length > 0 ? historial[historial.length - 1] : null;

    const unreadCount = historial.filter(
      (m) => !m.leido && m.sender_id !== this.miUsuarioId,
    ).length;

    const contactoNutri = {
      idUnico: this.nutricionistaId,
      pacienteId: this.miPacienteId,
      nutricionistaId: this.nutricionistaId,
      usuario: miPerfil.nutricionista.usuario,
      ultimoMensaje: ultimoMensaje,
      chatId: chat.id,
      unreadCount: unreadCount,
    };

    this.contactos.set([contactoNutri]);
    this.contactosFiltrados.set([contactoNutri]);
  }

  /**
   * Filtra la lista de contactos en base al término introducido en la barra de búsqueda.
   *
   * @param {*} event - Objeto del evento de Ionic Searchbar.
   */
  onBuscar(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.busquedaQuery.set(query);
    if (!query) {
      this.contactosFiltrados.set(this.contactos());
      return;
    }
    const filtrados = this.contactos().filter((c) => {
      const nombreCompleto = `${c.usuario?.nombre} ${c.usuario?.apellidos}`.toLowerCase();
      return nombreCompleto.includes(query);
    });
    this.contactosFiltrados.set(filtrados);
  }

  /**
   * Maneja el evento de selección de un contacto en el panel izquierdo.
   * Carga el historial del chat asociado, marca los mensajes como leídos
   * y crea la suscripción en tiempo real para recibir mensajes nuevos de esa sala.
   *
   * @param {*} contacto - Objeto con la información del contacto seleccionado.
   * @returns {Promise<void>}
   */
  async seleccionarContacto(contacto: any) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.contactos.update((list) =>
      list.map((c) => (c.idUnico === contacto.idUnico ? { ...c, unreadCount: 0 } : c)),
    );
    this.onBuscar({ detail: { value: this.busquedaQuery() } });

    this.contactoActivo.set(contacto);
    this.mensajes.set([]);

    const chat = await this.chatService.getOrCreateChat(
      contacto.nutricionistaId,
      contacto.pacienteId,
    );
    this.chatIdActivo = chat.id;

    // Actualización para todos (pacientes y nutricionistas)
    await this.chatService.marcarComoLeidos(this.chatIdActivo, this.miUsuarioId);
    this.chatService.actualizarContadorBadge(this.miUsuarioId, this.rol);

    const historial = await this.chatService.getMensajes(this.chatIdActivo);
    this.mensajes.set(historial);

    this.realtimeChannel = this.chatService.suscribirMensajes(this.chatIdActivo, (msg) => {
      this.mensajes.update((msgs) => [...msgs, msg]);
      if (msg.sender_id !== this.miUsuarioId) {
        this.chatService.marcarComoLeidos(this.chatIdActivo, this.miUsuarioId);
        this.chatService.actualizarContadorBadge(this.miUsuarioId, this.rol);
      }
      this.scrollToBottom();
      this.cdr.detectChanges();
    });

    this.scrollToBottom();
  }

  /**
   * Envía un nuevo mensaje al chat activo usando el texto en el input.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Actualiza localmente el "último mensaje" de un contacto en el panel lateral.
   *
   * @param {string} texto - Contenido del mensaje que se acaba de enviar.
   */
  actualizarUltimoMensajeLista(texto: string) {
    const current = this.contactoActivo();
    if (!current) return;

    const updated = this.contactos().map((c) => {
      if (c.idUnico === current.idUnico) {
        return { ...c, ultimoMensaje: { contenido: texto, enviado_at: new Date().toISOString() } };
      }
      return c;
    });
    this.contactos.set(updated);
    this.onBuscar({ detail: { value: this.busquedaQuery() } });
  }

  /**
   * Ajusta automáticamente el scroll de la zona de chat hacia la parte inferior.
   */
  scrollToBottom() {
    setTimeout(() => {
      if (this.chatScroll && this.chatScroll.nativeElement) {
        this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
      }
    }, 100);
  }

  /**
   * Método de ciclo de vida invocado al destruir el componente.
   * Elimina todas las suscripciones a canales en tiempo real activas.
   */
  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
    if (this.listChannel) {
      this.listChannel.unsubscribe();
    }
  }
}