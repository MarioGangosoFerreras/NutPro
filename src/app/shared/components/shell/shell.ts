import { Component, inject, signal, OnInit, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonMenu, IonIcon, IonRouterOutlet, IonSplitPane, IonAvatar, MenuController, IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, calendarOutline, gridOutline, logOutOutline, menuOutline, closeOutline,
  chevronForwardOutline, settingsOutline, giftOutline, personCircleOutline, restaurantOutline,
  chatbubblesOutline, walletOutline, homeOutline, trendingUpOutline, documentTextOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';
import { SupabaseService } from '../../../core/services/supabase';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterModule, IonMenu, IonIcon, IonRouterOutlet,
    IonSplitPane, IonAvatar, IonBadge,
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class Shell implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private menuCtrl = inject(MenuController);
  private chatService = inject(ChatService);
  private supabase = inject(SupabaseService).client;
  private cdr = inject(ChangeDetectorRef);

  static isCollapsed = signal(false);

  get collapsed() {
    return Shell.isCollapsed();
  }

  rutaActiva = signal('');

  // Ruta de inicio dinámica según el rol
  homeRoute = signal('/dashboard');

  mensajesSinLeer = computed(() => this.chatService.unreadCountBadge());

  usuarioActual = signal({
    nombre: 'Cargando...',
    rol: 'Nutricionista',
    avatar: null as string | null,
  });

  navItems = signal<NavItem[]>([]);

  constructor() {
    addIcons({
      peopleOutline, calendarOutline, gridOutline, logOutOutline,
      menuOutline, closeOutline, chevronForwardOutline, settingsOutline,
      giftOutline, personCircleOutline, restaurantOutline, chatbubblesOutline,
      walletOutline, homeOutline, trendingUpOutline, documentTextOutline,
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.rutaActiva.set(e.urlAfterRedirects);
    });
    this.rutaActiva.set(this.router.url);
  }

  async ngOnInit() {
    const user = await this.authService.getUsuario();
    if (user) {
      this.usuarioActual.set({
        nombre: `${user.nombre} ${user.apellidos}`.trim(),
        rol: user.rol === 'admin' ? 'Administrador' : (user.rol === 'paciente' ? 'Paciente' : 'Nutricionista'),
        avatar: user.avatar_url || null,
      });

      // Lógica separada por los 3 roles
      if (user.rol === 'admin') {
        this.homeRoute.set('/admin');

        this.navItems.set([
          { label: 'Panel Admin', icon: 'grid-outline', route: '/admin' },
          { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },
        ]);
      } else if (user.rol === 'paciente') {
        this.homeRoute.set('/portal-paciente');

        this.navItems.set([
          { label: 'Inicio', icon: 'home-outline', route: '/portal-paciente' },
          { label: 'Mi Dieta', icon: 'restaurant-outline', route: '/portal-paciente/plan' },
          { label: 'Mi Evolución', icon: 'trending-up-outline', route: '/portal-paciente/evolucion' },
          { label: 'Citas', icon: 'calendar-outline', route: '/portal-paciente/citas' },
          { label: 'Docs y Facturas', icon: 'document-text-outline', route: '/portal-paciente/documentos' },
          { label: 'Mensajes', icon: 'chatbubbles-outline', route: '/mensajes' },
          { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },
        ]);
      } else {
        this.homeRoute.set('/dashboard');

        this.navItems.set([
          { label: 'Inicio', icon: 'grid-outline', route: '/dashboard' },
          { label: 'Pacientes', icon: 'people-outline', route: '/pacientes' },
          { label: 'Citas', icon: 'calendar-outline', route: '/citas' },
          { label: 'Recetas', icon: 'restaurant-outline', route: '/alimentacion/recetas' },
          { label: 'Mensajes', icon: 'chatbubbles-outline', route: '/mensajes' },
          { label: 'Facturación', icon: 'wallet-outline', route: '/facturacion' },
          { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },
        ]);
      }

      // LÓGICA DE CONTADOR EN TIEMPO REAL (Para todos los roles)
      await this.chatService.actualizarContadorBadge(user.id, user.rol);

      this.supabase.channel('global-unread-badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, () => {
          this.chatService.actualizarContadorBadge(user.id, user.rol);
        })
        .subscribe();
    }
  }

  isActive(item: NavItem): boolean {
    const ruta = this.rutaActiva();

    // Si la ruta del elemento es la principal de Inicio (/dashboard o /portal-paciente)
    // exigimos que sea una coincidencia EXACTA para no iluminarse en las demás secciones.
    if (item.route === '/portal-paciente' || item.route === '/dashboard') {
      return ruta === item.route;
    }

    // Para el resto de rutas (ej: /pacientes, /alimentacion/recetas, /portal-paciente/plan)
    // queremos que se ilumine si es la ruta exacta o una subruta (ej: /pacientes/123)
    return ruta === item.route || ruta.startsWith(item.route + '/');
  }

  navegar(route: string) {
    this.router.navigate([route]);
    if (window.innerWidth < 992) this.menuCtrl.close('main-menu');
  }

  async cerrarSesion() {
    await this.authService.signOut();
    window.location.href = '/login';
  }
}