import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { UniversalCalendar } from "../../../shared/components/universal-calendar/universal-calendar";

@Component({
  selector: 'app-calendario-citas',
  standalone: true,
  imports: [IonContent, UniversalCalendar],
  templateUrl: './calendario-citas.html',
})
export class CalendarioCitas {}