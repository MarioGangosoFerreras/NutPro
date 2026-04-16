import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonRouterOutlet,
  IonSplitPane,
  IonMenuButton,
  IonButtons,
  IonTitle,
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
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  activeRoutes?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonMenu,
    IonContent,
    IonIcon,
    IonRouterOutlet,
    IonSplitPane,
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class Shell {
  private router = inject(Router);
  private authService = inject(AuthService);
  private menuCtrl = inject(MenuController);

  rutaActiva = signal('');
  isMobile = signal(window.innerWidth < 992);

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'grid-outline',
      route: '/dashboard',
      activeRoutes: ['/dashboard'],
    },
    {
      label: 'Pacientes',
      icon: 'people-outline',
      route: '/pacientes',
      activeRoutes: ['/pacientes'],
    },
    {
      label: 'Citas',
      icon: 'calendar-outline',
      route: '/citas',
      activeRoutes: ['/citas'],
    },
    {
      label: 'Ajustes',
      icon: 'settings-outline',
      route: '/ajustes',
      activeRoutes: ['/ajustes'],
    },
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
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.rutaActiva.set(e.urlAfterRedirects);
    });

    this.rutaActiva.set(this.router.url);
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 992);
  }

  isActive(item: NavItem): boolean {
    const ruta = this.rutaActiva();
    return (item.activeRoutes ?? [item.route]).some((r) => ruta.startsWith(r));
  }

  navegar(route: string) {
    this.router.navigate([route]);
    if (this.isMobile()) {
      this.menuCtrl.close('main-menu');
    }
  }

  async cerrarSesion() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
