import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem,
  IonButton, IonSpinner, ToastController, AlertController, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { documentOutline, documentTextOutline, cloudUploadOutline, trashOutline, downloadOutline, documentAttachOutline, chatbubblesOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { Documento, DocumentosService } from '../../../../../core/services/documentos';
import { ChatService } from '../../../../../core/services/chat';

/**
 * Pestaña responsable de gestionar los documentos y archivos adjuntos (Analíticas, informes, facturas) 
 * relacionados a un paciente. Muestra vistas y opciones diferentes dependiendo de si
 * se visualiza como "Paciente" o como "Nutricionista".
 *
 * @export
 * @class TabDocumentos
 * @implements {OnInit}
 */
@Component({
  selector: 'app-tab-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem, IonButton, IonSpinner, IonBadge],
  templateUrl: './tab-documentos.html',
  styleUrl: './tab-documentos.css',
})
export class TabDocumentos implements OnInit {
  /** Refiere a la información unificada del paciente. */
  @Input() paciente: any;
  /** Bandera clave para permutar y modular UI dependiendo de la sesión iniciada ('Paciente' = true, 'Nutricionista' = false). */
  @Input() esPaciente: boolean = false; // <-- Nos indica si es la vista del paciente

  subTabActiva: 'informes' | 'facturas' = 'informes';
  documentos: Documento[] = [];
  cargando = true;
  subiendo = false;

  private docsService = inject(DocumentosService);
  private chatService = inject(ChatService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  /** Inyecta los iconos usados dentro de la template HTML local del componente. */
  constructor() {
    addIcons({ documentOutline, documentTextOutline, cloudUploadOutline, trashOutline, downloadOutline, documentAttachOutline, chatbubblesOutline });
  }

  /** Inicializa desencadenando la descarga en lote de ficheros pertinentes al paciente ID */
  async ngOnInit() {
    await this.cargarDocs();
  }

  /**
   * Consulta al servicio el array de documentos de Supabase limitados al id en @Input `paciente.id`.
   * @returns {Promise<void>}
   */
  async cargarDocs() {
    try {
      this.documentos = await this.docsService.getDocumentos(this.paciente.id);
    } catch (e) {
      console.error(e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Filtra un array para presentar visualmente solo la lista escogida en la pantalla.
   *
   * @param {string} tipo - 'informe' u 'factura'.
   * @returns {Documento[]} Documentos coincidentes con el tipo especificado.
   */
  getDocumentosPorTipo(tipo: string) {
    return this.documentos.filter(d => d.tipo === tipo);
  }

  /**
   * Responde a un clic en un campo `<input type="file">`. Genera la subida asíncrona a un bucket
   * en Supabase y relanza la visualización del listado general.
   *
   * @param {*} event - Change event.
   * @returns {Promise<void>}
   */
  async subirInforme(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.subiendo = true;
    try {
      await this.docsService.subirDocumento(this.paciente.id, file, file.name, 'informe');
      await this.cargarDocs();
      const t = await this.toastCtrl.create({ message: 'Documento subido', duration: 2000, color: 'success' });
      t.present();
    } catch (e) {
      console.error(e);
    } finally {
      this.subiendo = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Procesa la eliminación física localmente y en Supabase referenciado desde listado.
   * Si la factura está atada a una cita, esta operación revertirá su variable `facturada` a false.
   *
   * @param {Documento} doc - Referencia extraída del *ngFor con la información técnica y URLs.
   * @returns {Promise<void>}
   */
  async eliminar(doc: Documento) {
    this.cargando = true;
    try {
      await this.docsService.eliminarDocumento(doc.id, doc.archivo_url, doc.cita_id);
      await this.cargarDocs();
    } catch (e) {
      console.error(e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  // --- LÓGICA DE AVISO DE PAGO PARA EL PACIENTE ---
  /**
   * Utilidad integrada para el paciente que le permite informar proactivamente a su
   * nutricionista, generando y emitiendo un mensaje por chat informando que 
   * una factura pendiente fue teóricamente saldada por fuera del sistema (Bizum, Transferencia, etc).
   *
   * @param {Documento} doc - Referencia a la factura a validar.
   * @returns {Promise<void>}
   */
  async notificarPago(doc: Documento) {
    if (!this.paciente) return;
    
    // Obtenemos el ID del nutricionista
    const nutriId = this.paciente.nutricionista?.id || this.paciente.nutricionista_id;
    const pacienteId = this.paciente.id;
    
    if (!nutriId || !pacienteId) return;

    try {
      const chat = await this.chatService.getOrCreateChat(nutriId, pacienteId);
      const mensaje = `¡Hola! Ya he realizado el pago correspondiente a la factura: *${doc.nombre}* (${doc.importe}€). Puedes verificarlo cuando quieras.`;
      
      await this.chatService.enviarMensaje(chat.id, this.paciente.usuario_id, mensaje);
      
      const t = await this.toastCtrl.create({ 
        message: 'Aviso de pago enviado a tu nutricionista por el chat.', 
        duration: 3500, 
        color: 'success',
        position: 'bottom'
      });
      t.present();
    } catch (error) {
      console.error('Error notificando pago:', error);
      const t = await this.toastCtrl.create({ 
        message: 'Error al enviar el aviso de pago.', 
        duration: 3000, 
        color: 'danger' 
      });
      t.present();
    }
  }
}