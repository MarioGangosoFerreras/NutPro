import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import {
  IonHeader, IonToolbar, IonButton, IonIcon,
  IonSearchbar, IonAvatar, IonBadge, IonButtons, IonMenuButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, notificationsOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  standalone: true, // Asegúrate de tener esto si usas standalone
  imports: [FormsModule, IonHeader, IonToolbar, IonButton, IonIcon, IonSearchbar, IonAvatar, IonBadge, IonButtons, IonMenuButton],
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
    addIcons({ notificationsOutline, personCircleOutline, menuOutline});
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
}