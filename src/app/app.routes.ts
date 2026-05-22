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
    path: 'registro-paciente',
    loadComponent: () =>
      import('./features/auth/registro-paciente/registro-paciente').then((m) => m.RegistroPaciente),
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
        path: 'facturacion',
        loadComponent: () =>
          import('./features/facturacion/facturacion').then((m) => m.Facturacion),
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
      {
        path: 'portal-paciente',
        loadComponent: () =>
          import('./features/portal-paciente/portal-paciente').then((m) => m.PortalPaciente),
      },
      {
        path: 'portal-paciente/plan',
        loadComponent: () =>
          import('./features/portal-paciente/components/mi-plan/mi-plan').then((m) => m.MiPlan),
      },
      {
        path: 'portal-paciente/evolucion',
        loadComponent: () =>
          import('./features/portal-paciente/components/mi-evolucion/mi-evolucion').then(
            (m) => m.MiEvolucion,
          ),
      },
      {
        path: 'portal-paciente/citas',
        loadComponent: () =>
          import('./features/portal-paciente/components/mis-citas/mis-citas').then((m) => m.MisCitas),
      },
      {
        path: 'portal-paciente/documentos',
        loadComponent: () =>
          import('./features/portal-paciente/components/mis-documentos/mis-documentos').then((m) => m.MisDocumentos),
      },
    ],
  },
];
