import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';

export interface Documento {
  id: string;
  paciente_id: string;
  tipo: 'informe' | 'factura';
  nombre: string;
  archivo_url: string;
  importe?: number;
  pagado?: boolean;
  created_at: string;
  paciente?: any;
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

  // NUEVO MÉTODO PARA FACTURACIÓN GLOBAL
  async getFacturasNutricionista(nutricionistaId: string): Promise<Documento[]> {
    const { data, error } = await this.supabase
      .from('documentos')
      .select(`
        *,
        paciente:pacientes!inner (
          nutricionista_id,
          usuario:usuario_id (nombre, apellidos)
        )
      `)
      .eq('tipo', 'factura')
      .eq('pacientes.nutricionista_id', nutricionistaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Documento[];
  }

  async subirDocumento(pacienteId: string, file: File | Blob, nombreArchivo: string, tipo: 'informe' | 'factura', importe: number = 0): Promise<Documento> {
    const fileExt = nombreArchivo.split('.').pop() || 'pdf';
    const filePath = `${pacienteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage.from('documentos').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = this.supabase.storage.from('documentos').getPublicUrl(filePath);

    const { data, error } = await this.supabase
      .from('documentos')
      .insert({
        paciente_id: pacienteId,
        tipo,
        nombre: nombreArchivo,
        archivo_url: urlData.publicUrl,
        importe, // <-- Insertar el importe
        pagado: false // Por defecto las facturas nuevas están pendientes
      })
      .select()
      .single();

    if (error) throw error;
    return data as Documento;
  }

  // Método para cambiar el estado de pago
  async actualizarEstadoPago(docId: string, pagado: boolean) {
    const { data, error } = await this.supabase
      .from('documentos')
      .update({ pagado }) 
      .eq('id', docId)
      .select() // <-- Pedimos que nos devuelva la fila
      .single(); // <-- Forzamos a que si no actualiza nada, lance un error

    if (error) {
      console.error('Error en Supabase (probablemente RLS):', error);
      throw error;
    }
    
    return data;
  }

  async eliminarDocumento(id: string, url: string) {
    const path = url.split('/documentos/')[1];
    if (path) {
      await this.supabase.storage.from('documentos').remove([path]);
    }
    const { error } = await this.supabase.from('documentos').delete().eq('id', id);
    if (error) throw error;
  }
}