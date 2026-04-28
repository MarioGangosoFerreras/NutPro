import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonMenu,
  IonIcon,
  IonRouterOutlet,
  IonSplitPane,
  IonAvatar,
  MenuController,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  calendarOutline,
  gridOutline,
  logOutOutline,
  menuOutline,
  closeOutline,
  chevronForwardOutline,
  settingsOutline,
  giftOutline,
  personCircleOutline,
  restaurantOutline,
  chatbubblesOutline,
  walletOutline,
  homeOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonMenu,
    IonIcon,
    IonRouterOutlet,
    IonSplitPane,
    IonAvatar,
    IonBadge,
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class Shell implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private menuCtrl = inject(MenuController);
  private chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef);

  static isCollapsed = signal(false);

  get collapsed() {
    return Shell.isCollapsed();
  }

  rutaActiva = signal('');
  mensajesSinLeer = signal(0);

  usuarioActual = signal({
    nombre: 'Cargando...',
    rol: 'Nutricionista',
    avatar: null as string | null,
  });

  // 1. Convertimos el menú a Signal para que sea totalmente reactivo
  navItems = signal<NavItem[]>([]);

  constructor() {
    addIcons({
      peopleOutline, calendarOutline, gridOutline, logOutOutline,
      menuOutline, closeOutline, chevronForwardOutline, settingsOutline,
      giftOutline, personCircleOutline, restaurantOutline, chatbubblesOutline,
      walletOutline, homeOutline
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

      // 2. Setear los items de forma dinámica con .set()
      if (user.rol === 'paciente') {
        this.navItems.set([
          { label: 'Inicio', icon: 'home-outline', route: '/portal-paciente' },
          { label: 'Mi Dieta', icon: 'restaurant-outline', route: '/portal-paciente/plan' },
          { label: 'Mi Evolución', icon: 'trending-up-outline', route: '/portal-paciente/evolucion' },
          { label: 'Mensajes', icon: 'chatbubbles-outline', route: '/mensajes' }
        ]);
      } else {
        this.navItems.set([
          { label: 'Inicio', icon: 'grid-outline', route: '/dashboard' },
          { label: 'Pacientes', icon: 'people-outline', route: '/pacientes' },
          { label: 'Citas', icon: 'calendar-outline', route: '/citas' },
          { label: 'Recetas', icon: 'restaurant-outline', route: '/alimentacion/recetas' },
          { label: 'Mensajes', icon: 'chatbubbles-outline', route: '/mensajes' },
          { label: 'Facturación', icon: 'wallet-outline', route: '/facturacion' },
          { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },
        ]);

        const nutriId = await this.authService.getNutricionistaId();
        if (nutriId) {
          this.mensajesSinLeer.set(await this.chatService.getMensajesSinLeerTotales(nutriId));
        }
      }
    }
  }

  isActive(item: NavItem): boolean {
    return this.rutaActiva().startsWith(item.route);
  }

  navegar(route: string) {
    this.router.navigate([route]);
    if (window.innerWidth < 992) this.menuCtrl.close('main-menu');
  }

  async cerrarSesion() {
    await this.authService.signOut();
    // 3. Forzamos recarga dura para limpiar completamente la caché y memoria SPA
    window.location.href = '/login';
  }
}