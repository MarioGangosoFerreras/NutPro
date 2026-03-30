import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonHeader, IonToolbar, IonButton, IonIcon,
  IonSearchbar, IonAvatar, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, notificationsOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  imports: [FormsModule, IonHeader, IonToolbar, IonButton, IonIcon, IonSearchbar, IonAvatar, IonBadge],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  searchQuery = '';
  avatarUrl: string | null = null;
  notificaciones = 0;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ notificationsOutline, personCircleOutline, logOutOutline  });
  }

  async ngOnInit() {
    const usuario = await this.authService.getUsuario();
    this.avatarUrl = usuario?.avatar_url || null;
  }

  buscarPaciente() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/pacientes'], {
        queryParams: { q: this.searchQuery }
      });
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}