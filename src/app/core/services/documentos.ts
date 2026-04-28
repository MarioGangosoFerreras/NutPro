import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Documento {
  id: string;
  paciente_id: string;
  tipo: 'informe' | 'factura';
  nombre: string;
  archivo_url: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private supabase = inject(SupabaseService).client;

  async getDocumentos(pacienteId: string): Promise<Documento[]> {
    const { data, error } = await this.supabase
      .from('documentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Documento[];
  }

  async subirDocumento(pacienteId: string, file: File | Blob, nombreArchivo: string, tipo: 'informe' | 'factura'): Promise<Documento> {
    const fileExt = nombreArchivo.split('.').pop() || 'pdf';
    const filePath = `${pacienteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Subir a Storage
    const { error: uploadError } = await this.supabase.storage
      .from('documentos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = this.supabase.storage
      .from('documentos')
      .getPublicUrl(filePath);

    // Guardar en la tabla
    const { data, error } = await this.supabase
      .from('documentos')
      .insert({
        paciente_id: pacienteId,
        tipo,
        nombre: nombreArchivo,
        archivo_url: urlData.publicUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data as Documento;
  }

  async eliminarDocumento(id: string, url: string) {
    // 1. Borrar de Storage (Extraer el path de la URL)
    const path = url.split('/documentos/')[1];
    if (path) {
      await this.supabase.storage.from('documentos').remove([path]);
    }
    // 2. Borrar de la tabla
    const { error } = await this.supabase.from('documentos').delete().eq('id', id);
    if (error) throw error;
  }
}