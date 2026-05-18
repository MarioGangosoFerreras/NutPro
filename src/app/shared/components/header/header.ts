import { Component, OnInit, inject, Input } from '@angular/core'; // Añadido Input
import { AuthService } from '../../../core/services/auth';
import {
  IonHeader, IonToolbar, IonButton, IonIcon,
  IonAvatar, IonBadge, IonButtons, MenuController, IonTitle // Añadido IonTitle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, personCircleOutline } from 'ionicons/icons';
import { Shell } from '../shell/shell';
import { CommonModule } from '@angular/common';

/**
 * Componente que representa la barra superior (header) de la aplicación.
 * Muestra el título de la página, el botón para expandir/colapsar el menú lateral 
 * y notificaciones u otros elementos genéricos de navegación.
 *
 * @export
 * @class Header
 * @implements {OnInit}
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonTitle],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  /** Título de la pantalla actual, recibido desde el componente padre. */
  @Input() titulo: string = '';
  
  avatarUrl: string | null = null;
  notificaciones = 0;

  private menuCtrl = inject(MenuController);
  private authService = inject(AuthService);

  /**
   * Obtiene el estado actual del menú lateral (si está colapsado o no) 
   * desde el componente maestro Shell.
   *
   * @readonly
   * @type {boolean}
   */
  get collapsed() {
    return Shell.isCollapsed();
  }

  /**
   * Crea una instancia de Header e inicializa los iconos de la cabecera.
   */
  constructor() {
    addIcons({ notificationsOutline, personCircleOutline });
  }

  /**
   * Método de inicialización del componente. Recupera la URL del avatar del usuario actual.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    this.avatarUrl = usuario?.avatar_url || null;
  }

  /**
   * Alterna el estado del menú. En pantallas grandes (PC/Tablets), colapsa el menú
   * a modo de barra lateral pequeña; en pantallas móviles, abre el Side Menu nativo de Ionic.
   */
  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }
}