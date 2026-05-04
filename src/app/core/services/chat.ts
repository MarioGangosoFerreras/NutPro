import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';

/**
 * Representa un mensaje dentro de un chat.
 */
export interface Mensaje {
  /** Identificador opcional del mensaje */
  id?: string;
  /** Identificador del chat al que pertenece el mensaje */
  chat_id: string;

  /** Identificador del remitente del mensaje */
  sender_id: string;
  /** Contenido del mensaje */
  contenido: string;
  /** Indica si el mensaje ha sido leído */
  leido: boolean;
  /** Fecha y hora en la que se envió el mensaje */
  enviado_at?: string;
}

/**
 * Servicio para la gestión de chats y mensajes con Supabase.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  /** Cliente de Supabase inyectado para acceder a la API */
  private supabase = inject(SupabaseService).client;

  /** Señal reactiva que contiene el total de mensajes no leídos para el badge */
  public unreadCountBadge = signal<number>(0);

  /**
   * Actualiza el contador de mensajes no leídos adaptándose al rol del usuario.
   *
   * @param usuarioId Identificador del usuario actual.
   * @param rol Rol del usuario (por ejemplo, 'nutricionista', 'admin' o 'paciente').
   */
  async actualizarContadorBadge(usuarioId: string, rol: string) {
    let chatIds: string[] = [];

    if (rol === 'nutricionista' || rol === 'admin') {
      const { data: nutri } = await this.supabase
        .from('nutricionistas')
        .select('id')
        .eq('usuario_id', usuarioId)
        .maybeSingle();
      if (nutri) {
        const { data: chats } = await this.supabase
          .from('chats')
          .select('id')
          .eq('nutricionista_id', nutri.id);
        chatIds = chats?.map((c: any) => c.id) || [];
      }
    } else if (rol === 'paciente') {
      const { data: pac } = await this.supabase
        .from('pacientes')
        .select('id')
        .eq('usuario_id', usuarioId)
        .maybeSingle();
      if (pac) {
        const { data: chats } = await this.supabase
          .from('chats')
          .select('id')
          .eq('paciente_id', pac.id);
        chatIds = chats?.map((c: any) => c.id) || [];
      }
    }

    if (chatIds.length === 0) {
      this.unreadCountBadge.set(0);
      return;
    }

    const { count } = await this.supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('leido', false)
      .neq('sender_id', usuarioId)
      .in('chat_id', chatIds);

    this.unreadCountBadge.set(count || 0);
  }

  /**
   * Obtiene el conteo de mensajes no leídos por chat para los chats indicados.
   *
   * @param chatIds Lista de identificadores de chat.
   * @param miUsuarioId Identificador del usuario actual para excluir sus propios mensajes.
   * @returns Un objeto con el conteo de mensajes no leídos por chat.
   */
  async getUnreadCountsPerChat(
    chatIds: string[],
    miUsuarioId: string,
  ): Promise<Record<string, number>> {
    if (!chatIds || chatIds.length === 0) return {};
    const { data, error } = await this.supabase
      .from('mensajes')
      .select('chat_id')
      .eq('leido', false)
      .neq('sender_id', miUsuarioId)
      .in('chat_id', chatIds);

    if (error) {
      console.error('Error obteniendo conteo de mensajes sin leer:', error);
      return {};
    }

    const unreadMap: Record<string, number> = {};
    data?.forEach((m) => {
      unreadMap[m.chat_id] = (unreadMap[m.chat_id] || 0) + 1;
    });
    return unreadMap;
  }

  /**
   * Obtiene un chat existente entre nutricionista y paciente o crea uno nuevo si no existe.
   *
   * @param nutricionistaId Identificador del nutricionista.
   * @param pacienteId Identificador del paciente.
   * @returns El chat existente o creado.
   */
  async getOrCreateChat(nutricionistaId: string, pacienteId: string) {
    let { data: chat, error } = await this.supabase
      .from('chats')
      .select('*')
      .eq('nutricionista_id', nutricionistaId)
      .eq('paciente_id', pacienteId)
      .maybeSingle();

    if (error) throw error;

    if (!chat) {
      const { data: nuevoChat, error: insertError } = await this.supabase
        .from('chats')
        .insert({ nutricionista_id: nutricionistaId, paciente_id: pacienteId })
        .select()
        .single();

      if (insertError) throw insertError;
      chat = nuevoChat;
    }
    return chat;
  }

  /**
   * Obtiene los mensajes de un chat ordenados por fecha de envío.
   *
   * @param chatId Identificador del chat.
   * @returns Lista de mensajes del chat.
   */
  async getMensajes(chatId: string): Promise<Mensaje[]> {
    const { data, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('chat_id', chatId)
      .order('enviado_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Envía un mensaje dentro de un chat.
   *
   * @param chatId Identificador del chat.
   * @param senderId Identificador del remitente.
   * @param contenido Texto del mensaje.
   */
  async enviarMensaje(chatId: string, senderId: string, contenido: string) {
    const { error } = await this.supabase.from('mensajes').insert({
      chat_id: chatId,
      sender_id: senderId,
      contenido: contenido,
    });

    if (error) throw error;
  }

  /**
   * Suscribe a cambios de mensajes en tiempo real para un chat.
   *
   * @param chatId Identificador del chat.
   * @param callback Función que se ejecuta cuando llega un nuevo mensaje.
   * @returns Suscripción al canal de Supabase.
   */
  suscribirMensajes(chatId: string, callback: (mensaje: Mensaje) => void) {
    return this.supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          callback(payload.new as Mensaje);
        },
      )
      .subscribe();
  }

  /**
   * Obtiene la lista de chats de un nutricionista junto con información del paciente y el último mensaje.
   *
   * @param nutricionistaId Identificador del nutricionista.
   * @returns Lista de chats con datos asociados.
   */
  async getChatsNutricionista(nutricionistaId: string) {
    const { data, error } = await this.supabase
      .from('chats')
      .select(
        `
        id,
        paciente:paciente_id (
          id,
          usuario:usuario_id (
            nombre,
            apellidos,
            avatar_url
          )
        ),
        ultimo_mensaje:mensajes (
          contenido,
          enviado_at,
          leido
        )
      `,
      )
      .eq('nutricionista_id', nutricionistaId)
      .order('enviado_at', { referencedTable: 'mensajes', ascending: false })
      .limit(1, { referencedTable: 'mensajes' });

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene el total de mensajes no leídos para todos los chats de un nutricionista.
   *
   * @param nutricionistaId Identificador del nutricionista.
   * @returns Total de mensajes no leídos.
   */
  async getMensajesSinLeerTotales(nutricionistaId: string): Promise<number> {
    const { data: nutriData } = await this.supabase
      .from('nutricionistas')
      .select('usuario_id')
      .eq('id', nutricionistaId)
      .single();

    const nutriUsuarioId = nutriData?.usuario_id;

    const { data: chats } = await this.supabase
      .from('chats')
      .select('id')
      .eq('nutricionista_id', nutricionistaId);

    const chatIds = chats?.map((c: any) => c.id) ?? [];
    if (!chatIds.length) return 0;

    let query = this.supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('leido', false)
      .in('chat_id', chatIds);

    if (nutriUsuarioId) {
      query = query.neq('sender_id', nutriUsuarioId);
    }

    const { count } = await query;
    return count ?? 0;
  }

  /**
   * Marca como leídos los mensajes de un chat que no fueron enviados por el nutricionista.
   *
   * @param chatId Identificador del chat.
   * @param nutriUsuarioId Identificador del usuario nutricionista.
   */
  async marcarComoLeidos(chatId: string, nutriUsuarioId: string) {
    await this.supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('chat_id', chatId)
      .neq('sender_id', nutriUsuarioId)
      .eq('leido', false);
  }
}
