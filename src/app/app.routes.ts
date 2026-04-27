import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'pendiente-verificacion',
    loadComponent: () =>
      import('./features/auth/pendiente-verificacion/pendiente-verificacion').then(
        (m) => m.PendienteVerificacion,
      ),
  },
  // ── Rutas protegidas envueltas en el Shell ──
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'pacientes',
        loadComponent: () =>
          import('./features/pacientes/lista-pacientes/lista-pacientes').then(
            (m) => m.ListaPacientes,
          ),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./features/dashboard/calendario-citas/calendario-citas').then(
            (m) => m.CalendarioCitas,
          ),
      },
      {
        path: 'alimentacion/recetas',
        loadComponent: () =>
          import('./features/alimentacion/recetas/lista-recetas/lista-recetas').then(
            (m) => m.ListaRecetas,
          ),
      },
      {
        path: 'alimentacion/recetas/nueva',
        loadComponent: () =>
          import('./features/alimentacion/recetas/crear-receta/crear-receta').then(
            (m) => m.CrearReceta,
          ),
      },
      {
        path: 'alimentacion/recetas/editar/:id',
        loadComponent: () =>
          import('./features/alimentacion/recetas/crear-receta/crear-receta').then(
            (m) => m.CrearReceta,
          ),
      },
      {
        path: 'alimentacion/recetas/:id',
        loadComponent: () =>
          import('./features/alimentacion/recetas/detalle-receta/detalle-receta').then(
            (m) => m.DetalleReceta,
          ),
      },
      {
        path: 'pacientes/nuevo',
        loadComponent: () =>
          import('./features/pacientes/nuevo-paciente/nuevo-paciente').then((m) => m.NuevoPaciente),
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./features/pacientes/ficha-paciente/ficha-paciente').then((m) => m.FichaPaciente),
      },
      {
        path: 'mensajes',
        loadComponent: () => import('./features/mensajes/mensajes').then((m) => m.Mensajes),
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./features/ajustes/ajustes').then((m) => m.AjustesPage),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/admin/panel-admin/panel-admin').then((m) => m.PanelAdmin),
      },
      {
        path: 'oauth/google',
        loadComponent: () =>
          import('./features/auth/oauth-callback.page').then((m) => m.OAuthCallbackPage),
      },
      {
        path: 'pacientes/:id/chat',
        loadComponent: () =>
          import('./features/pacientes/chat-paciente/chat-paciente').then((m) => m.ChatPaciente),
      },
    ],
  },
];
