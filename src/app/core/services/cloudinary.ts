/**
 * Servicio para gestionar la subida de imágenes a Cloudinary.
 *
 * Usa las variables de entorno definidas en el proyecto para configurar
 * el nombre del cloud y el preset de subida.
 */
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {

  private cloudName = environment.cloudinaryCloudName;
  private uploadPreset = environment.cloudinaryUploadPreset;

  /**
   * Sube una imagen a Cloudinary y devuelve la URL segura de la imagen.
   *
   * @param file Archivo de imagen que se quiere subir.
   * @returns URL segura de la imagen si la subida fue exitosa, o null en caso de error.
   */
  async uploadImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', 'nutpro/avatars');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        return data.secure_url;
      }

      console.error('Error Cloudinary:', data);
      return null;

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      return null;
    }
  }
}