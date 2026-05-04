import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth';

/**
 * Componente que se muestra a los usuarios con rol de nutricionista
 * cuya cuenta aún no ha sido aprobada (verificada) por un administrador.
 * Impide el acceso al dashboard de la aplicación.
 *
 * @export
 * @class PendienteVerificacion
 */
@Component({
  selector: 'app-pendiente-verificacion',
  imports: [IonContent, IonButton],
  templateUrl: './pendiente-verificacion.html',
  styleUrl: './pendiente-verificacion.css'
})
export class PendienteVerificacion {
  /**
   * Crea una instancia del componente PendienteVerificacion.
   *
   * @param {AuthService} authService - Servicio de autenticación.
   * @param {Router} router - Servicio de enrutamiento para navegar al login tras cerrar sesión.
   */
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Cierra la sesión actual del usuario y lo redirige a la pantalla de inicio de sesión.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}