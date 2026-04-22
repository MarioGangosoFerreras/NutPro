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

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButton, IonIcon, IonAvatar, IonBadge, IonButtons, IonTitle],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  @Input() titulo: string = ''; // 👈 Nuevo Input para el nombre de la pantalla
  avatarUrl: string | null = null;
  notificaciones = 0;

  private menuCtrl = inject(MenuController);
  private authService = inject(AuthService);

  get collapsed() {
    return Shell.isCollapsed();
  }

  constructor() {
    addIcons({ notificationsOutline, personCircleOutline });
  }

  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    this.avatarUrl = usuario?.avatar_url || null;
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }
}