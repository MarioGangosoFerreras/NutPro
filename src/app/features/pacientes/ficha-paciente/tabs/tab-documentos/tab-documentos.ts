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

@Component({
  selector: 'app-tab-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem, IonButton, IonSpinner, IonBadge],
  templateUrl: './tab-documentos.html',
  styleUrl: './tab-documentos.css',
})
export class TabDocumentos implements OnInit {
  @Input() paciente: any;
  @Input() esPaciente: boolean = false; // <-- Nos indica si es la vista del paciente

  subTabActiva: 'informes' | 'facturas' = 'informes';
  documentos: Documento[] = [];
  cargando = true;
  subiendo = false;

  private docsService = inject(DocumentosService);
  private chatService = inject(ChatService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ documentOutline, documentTextOutline, cloudUploadOutline, trashOutline, downloadOutline, documentAttachOutline, chatbubblesOutline });
  }

  async ngOnInit() {
    await this.cargarDocs();
  }

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

  getDocumentosPorTipo(tipo: string) {
    return this.documentos.filter(d => d.tipo === tipo);
  }

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