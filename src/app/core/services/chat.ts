import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Mensaje {
  id?: string;
  chat_id: string;
  sender_id: string;
  contenido: string;
  leido: boolean;
  enviado_at?: string; // Modificado para coincidir con tu BD
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private supabase = inject(SupabaseService).client;

  // 1. Obtener o crear el chat
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

  // 2. Obtener historial de mensajes
  async getMensajes(chatId: string): Promise<Mensaje[]> {
    const { data, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('chat_id', chatId)
      .order('enviado_at', { ascending: true }); // Actualizado a enviado_at

    if (error) throw error;
    return data || [];
  }

  // 3. Enviar un mensaje
  async enviarMensaje(chatId: string, senderId: string, contenido: string) {
    const { error } = await this.supabase
      .from('mensajes')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        contenido: contenido
      });

    if (error) throw error;
  }

  // 4. Suscribirse a nuevos mensajes
  suscribirMensajes(chatId: string, callback: (mensaje: Mensaje) => void) {
    return this.supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          callback(payload.new as Mensaje);
        }
      )
      .subscribe();
  }
  
  async getChatsNutricionista(nutricionistaId: string) {
  const { data, error } = await this.supabase
    .from('chats')
    .select(`
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
    `)
    .eq('nutricionista_id', nutricionistaId)
    .order('created_at', { foreignTable: 'mensajes', ascending: false })
    .limit(1, { foreignTable: 'mensajes' });

  if (error) throw error;
  return data;
}
}