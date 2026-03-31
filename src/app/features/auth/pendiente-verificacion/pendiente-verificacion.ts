import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-pendiente-verificacion',
  imports: [IonContent, IonButton],
  templateUrl: './pendiente-verificacion.html',
  styleUrl: './pendiente-verificacion.css'
})
export class PendienteVerificacion {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}