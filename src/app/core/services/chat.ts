// src/app/core/services/chat.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Mensaje {
  id?: string;
  chat_id: string;
  sender_id: string;
  contenido: string;
  leido: boolean;
  enviado_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private supabase = inject(SupabaseService).client;

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

  async getMensajes(chatId: string): Promise<Mensaje[]> {
    const { data, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('chat_id', chatId)
      .order('enviado_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async enviarMensaje(chatId: string, senderId: string, contenido: string) {
    const { error } = await this.supabase.from('mensajes').insert({
      chat_id: chatId,
      sender_id: senderId,
      contenido: contenido,
    });

    if (error) throw error;
  }

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

  async marcarComoLeidos(chatId: string, nutriUsuarioId: string) {
    await this.supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('chat_id', chatId)
      .neq('sender_id', nutriUsuarioId)
      .eq('leido', false);
  }
}
