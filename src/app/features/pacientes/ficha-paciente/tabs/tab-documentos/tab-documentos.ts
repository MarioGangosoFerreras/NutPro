import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem,
  IonButton, IonSpinner, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { documentOutline, documentTextOutline, cloudUploadOutline, trashOutline, downloadOutline, documentAttachOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
import { Documento, DocumentosService } from '../../../../../core/services/documentos';

@Component({
  selector: 'app-tab-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonList, IonItem, IonButton, IonSpinner],
  templateUrl: './tab-documentos.html',
  styleUrl: './tab-documentos.css',
})
export class TabDocumentos implements OnInit {
  @Input() paciente: any;
  subTabActiva: 'informes' | 'facturas' = 'informes';
  documentos: Documento[] = [];
  cargando = true;
  subiendo = false;

  private docsService = inject(DocumentosService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ documentOutline, documentTextOutline, cloudUploadOutline, trashOutline, downloadOutline, documentAttachOutline });
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
      // Pasamos el id, la url y el cita_id (si existe)
      await this.docsService.eliminarDocumento(doc.id, doc.archivo_url, doc.cita_id);
      await this.cargarDocs();
    } catch (e) {
      console.error(e);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}