import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonMenu,
  IonContent,
  IonIcon,
  IonRouterOutlet,
  IonSplitPane,
  IonAvatar,
  MenuController,
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
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class Shell implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private menuCtrl = inject(MenuController);
  private chatService = inject(ChatService);

  chats = signal<any[]>([]);

  // Signal estático: permite al Header cambiar el estado sin usar un servicio
  static isCollapsed = signal(false);

  get collapsed() {
    return Shell.isCollapsed();
  }

  rutaActiva = signal('');
  usuarioActual = signal({
    nombre: 'Cargando...',
    rol: 'Nutricionista',
    avatar: null as string | null,
  });

  navItems: NavItem[] = [
    { label: 'Inicio', icon: 'grid-outline', route: '/dashboard' },
    { label: 'Pacientes', icon: 'people-outline', route: '/pacientes' },
    { label: 'Citas', icon: 'calendar-outline', route: '/citas' },
    { label: 'Recetas', icon: 'restaurant-outline', route: '/alimentacion/recetas' },
    { label: 'Ajustes', icon: 'settings-outline', route: '/ajustes' },

  ];

  constructor() {
    addIcons({
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
        rol: user.rol === 'admin' ? 'Administrador' : 'Nutricionista',
        avatar: user.avatar_url || null,
      });
      const nutriId = await this.authService.getNutricionistaId();
      if (nutriId) {
        this.chats.set(await this.chatService.getChatsNutricionista(nutriId));
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
    this.router.navigate(['/login']);
  }
}
