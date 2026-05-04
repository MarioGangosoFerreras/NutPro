import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guardia de autenticación que verifica si el usuario está autenticado y autorizado para acceder a la ruta.
 * Comprueba la sesión del usuario, su existencia, y en caso de ser nutricionista, que esté verificado.
 * Los administradores siempre tienen acceso.
 * @param route La instantánea de la ruta activada.
 * @param state El estado del enrutador.
 * @returns Una promesa que resuelve a true si el acceso está permitido, false en caso contrario.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await authService.getSession();

  if (!data.session) {
    router.navigate(['/login']);
    return false;
  }

  const usuario = await authService.getUsuario();

  if (!usuario) {
    router.navigate(['/login']);
    return false;
  }

  // Admin siempre puede pasar
  if (usuario.rol === 'admin') {
    return true;
  }

  // Si es nutricionista, comprobar que está verificado
  if (usuario.rol === 'nutricionista') {
    const nutricionista = await authService.getNutricionistaEstado();
    if (nutricionista?.estado !== 'activo') {
      router.navigate(['/pendiente-verificacion']);
      return false;
    }
  }

  return true;
};