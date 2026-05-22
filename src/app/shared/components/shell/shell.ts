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

/**
 * Interfaz local que describe los elementos requeridos para construir una entrada
 * de navegación en el sidebar de la aplicación.
 *
 * @interface NavItem
 */
interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/**
 * Componente maestro contenedor "Wrapper" que organiza el diseño general de la App.
 * Consta del menú lateral persistente (`ion-menu`) en la izquierda, y un enrutador interno (`ion-router-outlet`) a la derecha,
 * manejando qué menús mostrar en base a roles y controlando la señal en tiempo real
 * del contador global de mensajes.
 *
 * @export
 * @class Shell
 * @implements {OnInit}
 */
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

  /**
   * Señal estática de estado global. Almacena si el menú lateral está colapsado minimizándose a iconos 
   * (usado principalmente en pantallas grandes para ganar ancho de visualización).
   */
  static isCollapsed = signal(false);

  /** Exposición directa para el HTML del booleano global `isCollapsed`. */
  get collapsed() {
    return Shell.isCollapsed();
  }

  /** Variable reactiva que permite cotejar la URL actual para "iluminar" un botón del sidebar. */
  rutaActiva = signal('');

  /** Ruta de inicio dinámica. Carga el Dashboard si es Nutricionista, o el PortalPaciente si es paciente. */
  homeRoute = signal('/dashboard');

  /** Getter computado automático: Muestra el indicador rojo numérico en la pestaña de mensajes. */
  mensajesSinLeer = computed(() => this.chatService.unreadCountBadge());

  /** Almacena un resumen básico del perfil autenticado para poblar el "Footer" del sidebar. */
  usuarioActual = signal({
    nombre: 'Cargando...',
    rol: 'Nutricionista',
    avatar: null as string | null,
  });

  /** Array que alberga los botones y rutas renderizados a lo largo del menú izquierdo. */
  navItems = signal<NavItem[]>([]);

  /**
   * Configura las dependencias, importa la iconografía masiva requerida
   * y efectúa un binding constante sobre la ruta de `router.events`
   * para actualizar al momento la marca azul/verde de la sección actual al navegar.
   */
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

  /**
   * Carga los datos crudos del usuario, determina su arquitectura (NavItems),
   * arranca el cálculo del badge de notificación y crea el canal WebSocket global.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const user = await this.authService.getUsuario();
    if (user) {
      this.usuarioActual.set({
        nombre: `${user.nombre} ${user.apellidos}`.trim(),
        rol: user.rol === 'admin' ? 'Administrador' : (user.rol === 'paciente' ? 'Paciente' : 'Nutricionista'),
        avatar: user.avatar_url || null,
      });

      if (user.rol === 'admin') {
        // Asignamos la ruta base del admin
        this.homeRoute.set('/admin');

        this.navItems.set([
          { label: 'Inicio', icon: 'home-outline', route: '/admin' },
          { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },
        ]);
      } else if (user.rol === 'paciente') {
        // Asignamos la ruta base del paciente
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
        // Asignamos la ruta base del nutricionista
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

  /**
   * Chequeador condicional para saber si un enlace de menú se corresponde
   * o contiene (rutas hijas) la ruta visualizada actualmente en navegador, aplicando el estilo ".active".
   *
   * @param {NavItem} item - Botón del bucle For.
   * @returns {boolean} Retorna `true` si es la página mostrándose.
   */
  isActive(item: NavItem): boolean {
    const ruta = this.rutaActiva();

    // Si la ruta del elemento es la principal de Inicio (/dashboard, /portal-paciente o /admin)
    // exigimos que sea una coincidencia EXACTA para no iluminarse en las demás secciones.
    if (item.route === '/portal-paciente' || item.route === '/dashboard' || item.route === '/admin') {
      return ruta === item.route;
    }

    // Para el resto de rutas (ej: /pacientes, /alimentacion/recetas, /portal-paciente/plan)
    // queremos que se ilumine si es la ruta exacta o una subruta (ej: /pacientes/123)
    return ruta === item.route || ruta.startsWith(item.route + '/');
  }

  /**
   * Acción disparada al presionar un ítem. Usa router nativo para ir a otra URL, 
   * pero aprovecha de esconder el cajón (menu overlay) si la web está en viewport comprimido de teléfono.
   *
   * @param {string} route - URI meta de redirección.
   */
  navegar(route: string) {
    this.router.navigate([route]);
    if (window.innerWidth < 992) this.menuCtrl.close('main-menu');
  }

  /**
   * Contacta a Supabase mediante su core service borrando la key session local 
   * y remueve forzosamente la vista recargando todo a nivel vanilla (href) para asegurar blanqueo de variables.
   *
   * @returns {Promise<void>}
   */
  async cerrarSesion() {
    await this.authService.signOut();
    window.location.href = '/login';
  }
}