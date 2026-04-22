import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular/standalone';
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";
import { Shell } from '../../../shared/components/shell/shell';

@Component({
  selector: 'app-calendario-citas',
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, UniversalCalendar],
  templateUrl: './calendario-citas.html',
})
export class CalendarioCitas implements OnInit {
  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);

  cargandoPagina = signal(true); // Signal de carga global
  
  ngOnInit(): void {
    // Simulamos un tiempo mínimo para que la transición sea fluida
    setTimeout(() => {
      this.cargandoPagina.set(false);
      this.cdr.detectChanges();
    }, 800);
  }

  get collapsed() {
    return Shell.isCollapsed();
  }

  toggleMenu() {
    if (window.innerWidth >= 992) {
      Shell.isCollapsed.set(!Shell.isCollapsed());
    } else {
      this.menuCtrl.toggle('main-menu');
    }
  }
}