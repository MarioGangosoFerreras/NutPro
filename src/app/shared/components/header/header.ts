import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonHeader, IonToolbar, IonButton, IonIcon,
  IonSearchbar, IonAvatar, IonBadge, IonButtons, MenuController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, personCircleOutline } from 'ionicons/icons';
import { Shell } from '../shell/shell';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, IonHeader, IonToolbar, IonButton, IonIcon, IonSearchbar, IonAvatar, IonBadge, IonButtons],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  searchQuery = '';
  avatarUrl: string | null = null;
  notificaciones = 0;

  private menuCtrl = inject(MenuController);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Leemos el estado desde el Shell
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
      // Escritorio: Animamos el ancho
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      // Móvil: Abrimos/cerramos el menú lateral normal
      this.menuCtrl.toggle('main-menu');
    }
  }

  buscarPaciente() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/pacientes'], {
        queryParams: { q: this.searchQuery }
      });
    }
  }
}