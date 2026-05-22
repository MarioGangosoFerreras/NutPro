import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';



export interface Documento {
  id: string;
  paciente_id: string;
  cita_id?: string;
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

  /**
   * Obtiene todos los documentos asociados a un paciente.
   * @param pacienteId - ID del paciente
   * @returns Promesa con un array de documentos del paciente ordenados por fecha de creación descendente
   * @throws Error si la consulta falla
   */
  async getDocumentos(pacienteId: string): Promise<Documento[]> {
    const { data, error } = await this.supabase
      .from('documentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Documento[];
  }

  /**
   * Obtiene todas las facturas de un nutricionista específico.
   * @param nutricionistaId - ID del nutricionista
   * @returns Promesa con un array de facturas del nutricionista con información del paciente
   * @throws Error si la consulta falla
   */
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

  /**
   * Sube un documento (informe o factura) al almacenamiento y lo registra en la base de datos.
   * @param pacienteId - ID del paciente propietario del documento
   * @param file - Archivo a subir (File o Blob)
   * @param nombreArchivo - Nombre del archivo con extensión
   * @param tipo - Tipo de documento: 'informe' o 'factura'
   * @param importe - Importe del documento si es una factura (por defecto 0)
   * @param citaId - ID de la cita asociada (opcional)
   * @returns Promesa con el documento creado
   * @throws Error si la subida o inserción falla
   */
  async subirDocumento(pacienteId: string, file: File | Blob, nombreArchivo: string, tipo: 'informe' | 'factura', importe: number = 0, citaId?: string): Promise<Documento> {
    const fileExt = nombreArchivo.split('.').pop() || 'pdf';
    const filePath = `${pacienteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage.from('documentos').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = this.supabase.storage.from('documentos').getPublicUrl(filePath);

    const { data, error } = await this.supabase
      .from('documentos')
      .insert({
        paciente_id: pacienteId,
        cita_id: citaId,
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

  /**
   * Actualiza el estado de pago de un documento.
   * @param docId - ID del documento a actualizar
   * @param pagado - Nuevo estado de pago del documento
   * @returns Promesa con los datos del documento actualizado
   * @throws Error si la actualización falla o no existe el documento
   */
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

  /**
   * Elimina un documento del almacenamiento y de la base de datos.
   * Si el documento está asociado a una cita, marca la cita como no facturada.
   * @param id - ID del documento a eliminar
   * @param url - URL pública del documento
   * @param citaId - ID de la cita asociada (opcional)
   * @throws Error si la eliminación falla
   */
  async eliminarDocumento(id: string, url: string, citaId?: string) {
    const path = url.split('/documentos/')[1];
    if (path) {
      await this.supabase.storage.from('documentos').remove([path]);
    }

    // Si el documento tiene una cita asociada, la ponemos como NO facturada
    if (citaId) {
      await this.supabase
        .from('citas')
        .update({ facturada: false })
        .eq('id', citaId);
    }

    const { error } = await this.supabase.from('documentos').delete().eq('id', id);
    if (error) throw error;
  }
}