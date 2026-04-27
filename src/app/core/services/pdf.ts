// src/app/core/services/pdf.ts
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({ providedIn: 'root' })
export class PdfService {
  async exportarMenuSemanal(paciente: any, plan: any, entradas: any[]) {
    // 1. CONFIGURACIÓN: 'l' para Landscape (Horizontal)
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

    // 2. ENCABEZADO Y FOTO DEL NUTRICIONISTA
    doc.setFillColor(45, 106, 79);
    doc.rect(0, 0, pageWidth, 40, 'F');

    const nutri = paciente?.nutricionista?.usuario;
    const nombrePaciente = paciente?.usuario?.nombre
      ? `${paciente.usuario.nombre} ${paciente.usuario.apellidos || ''}`.trim()
      : 'Paciente';

    // Imagen del nutricionista como icono principal a la izquierda
    if (nutri?.avatar_url) {
      try {
        const nutriImg = await this.getBase64ImageFromUrl(nutri.avatar_url);
        // Dibujamos la imagen (circular por CSS no es posible aquí, pero se ve profesional)
        doc.addImage(nutriImg, 'JPEG', 15, 8, 24, 24);
      } catch (e) {
        console.error('Error cargando avatar del nutricionista para el PDF', e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`Plan Nutricional de ${nombrePaciente}`, 45, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 45, 25);

    if (nutri) {
      doc.text(`Nutricionista: ${nutri.nombre} ${nutri.apellidos}`, 45, 31);
    }

    // 3. DETALLES DEL PLAN (Sin nombre del paciente)
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text('Estructura del Plan', 15, 52);
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 54, pageWidth - 15, 54);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Objetivo: ${plan?.objetivo || 'Personalizado'}`, 15, 62);

    doc.setFont('helvetica', 'bold');
    doc.text(`Calorías Diarias Objetivo: ${plan?.calorias_objetivo || 0} kcal`, 15, 68);

    // 4. TABLA DEL MENÚ (En horizontal cabe mucho mejor)
    const diasLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const tiposComida = [
      { id: 'desayuno', label: 'Desayuno' },
      { id: 'comida', label: 'Comida' },
      { id: 'snack', label: 'Snacks' },
      { id: 'cena', label: 'Cena' },
    ];

    const body = tiposComida.map((tipo) => {
      const fila: any[] = [tipo.label];
      for (let i = 1; i <= 7; i++) {
        const entrada = entradas.find((e) => e.dia_semana === i && e.tipo_comida === tipo.id);
        const nombreReceta = entrada?.receta?.nombre || '';
        fila.push(entrada ? `${nombreReceta}\n(${entrada.receta?.calorias_kcal || 0} kcal)` : '-');
      }
      return fila;
    });

    autoTable(doc, {
      startY: 75,
      head: [['Comida', ...diasLabels]],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [45, 106, 79], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        valign: 'middle',
        halign: 'center',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'left', cellWidth: 30 },
      },
    });

    // 5. PIE DE PÁGINA Y MARCA DE AGUA
    try {
      const logoNutPro = await this.getBase64ImageFromUrl('img/Logo_app.png');
      // Marca de agua sutil abajo a la derecha
      doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
      doc.addImage(logoNutPro, 'PNG', pageWidth - 50, pageHeight - 50, 35, 35);
      doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
    } catch (e) {}

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Este plan ha sido generado por un profesional de la salud utilizando la plataforma NutPro.',
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' },
    );

    const filename = `Plan_${nombrePaciente.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
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
