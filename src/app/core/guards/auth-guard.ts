import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await authService.getSession();

  if (data.session) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};