import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
  },

  {
  path: 'register',
  loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
},

{
  path: 'pacientes',
  canActivate: [authGuard],
  loadComponent: () => import('./features/pacientes/lista-pacientes/lista-pacientes').then(m => m.ListaPacientes)
},
{
  path: 'pacientes/nuevo',
  canActivate: [authGuard],
  loadComponent: () => import('./features/pacientes/nuevo-paciente/nuevo-paciente')
    .then(m => m.NuevoPaciente)
},
{
  path: 'pendiente-verificacion',
  loadComponent: () => import('./features/auth/pendiente-verificacion/pendiente-verificacion')
    .then(m => m.PendienteVerificacion)
},
{
  path: 'admin',
  canActivate: [authGuard],
  loadComponent: () => import('./features/admin/panel-admin/panel-admin')
    .then(m => m.PanelAdmin)
},
{
  path: 'pacientes/:id',
  canActivate: [authGuard],
  loadComponent: () => import('./features/pacientes/ficha-paciente/ficha-paciente')
    .then(m => m.FichaPaciente)
}
];