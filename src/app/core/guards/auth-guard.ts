import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

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