// src/app/core/services/pdf.service.ts
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({ providedIn: 'root' })
export class PdfService {
  async exportarMenuSemanal(paciente: any, plan: any, entradas: any[]) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. ENCABEZADO Y LOGO
    doc.setFillColor(45, 106, 79);
    doc.rect(0, 0, pageWidth, 40, 'F');

    try {
      const logoBase64 = await this.getBase64ImageFromUrl('img/Logo_app.png');
      doc.addImage(logoBase64, 'PNG', 15, 8, 24, 24);
    } catch (e) {}

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Plan Nutricional NutPro', 45, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 45, 24);

    // ─── NUEVO: INFORMACIÓN DEL NUTRICIONISTA EN EL HEADER ───
    const nutri = paciente?.nutricionista?.usuario;
    if (nutri) {
      doc.setFontSize(10);
      doc.text(`Nutricionista: ${nutri.nombre} ${nutri.apellidos}`, 45, 30);

      // Si el nutricionista tiene foto, la ponemos a la derecha
      if (nutri.avatar_url) {
        try {
          const nutriImg = await this.getBase64ImageFromUrl(nutri.avatar_url);
          doc.addImage(nutriImg, 'JPEG', pageWidth - 35, 8, 24, 24);
        } catch (e) {}
      }
    }

    // 2. DATOS DEL PACIENTE Y OBJETIVOS
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text('Detalles del Plan', 15, 50);
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 52, pageWidth - 15, 52);

    doc.setFontSize(11);
    doc.text(`Paciente: ${paciente?.usuario?.nombre} ${paciente?.usuario?.apellidos}`, 15, 60);
    doc.text(`Objetivo: ${plan?.objetivo || 'Personalizado'}`, 15, 66);

    // 👈 AQUÍ SE FIJA EL PROBLEMA DE LAS CALORÍAS
    const kcal = plan?.calorias_objetivo || 0;
    doc.setFont('helvetica', 'bold');
    doc.text(`Calorías Diarias: ${kcal} kcal`, 15, 72);
    doc.setFont('helvetica', 'normal');

    // 3. TABLA DEL MENÚ
    const diasLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const tiposComida = [
      { id: 'desayuno', label: 'Desayuno' },
      { id: 'comida', label: 'Comida' },
      { id: 'snack', label: 'Snack' },
      { id: 'cena', label: 'Cena' },
    ];

    const body = tiposComida.map((tipo) => {
      const fila: any[] = [tipo.label];
      for (let i = 1; i <= 7; i++) {
        const entrada = entradas.find((e) => e.dia_semana === i && e.tipo_comida === tipo.id);
        const nombreR = entrada?.receta?.nombre || entrada?.receta?.titulo;
        fila.push(entrada ? `${nombreR}\n(${entrada.receta?.calorias_kcal || 0} kcal)` : '-');
      }
      return fila;
    });

    autoTable(doc, {
      startY: 80,
      head: [['Comida', ...diasLabels]],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [29, 185, 84], textColor: 255, fontStyle: 'bold' },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
        halign: 'center',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'left', cellWidth: 22 },
      },
    });

    const filename = `Plan_${paciente?.usuario?.nombre || 'NutPro'}_${new Date().getTime()}.pdf`;
    doc.save(filename);
  }

  private getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('No context'));
        }
      };
      img.onerror = (error) => reject(error);
      img.src = imageUrl;
    });
  }
}
