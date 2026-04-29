import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-habitos-tracker',
  standalone: true,
  imports: [CommonModule, IonCard, ],
  templateUrl: './habitos-tracker.html',
  styleUrls: ['../../portal-paciente.css']
})
export class HabitosTrackerComponent {
  @Input() habitos: any;
  @Output() onToggle = new EventEmitter<{tipo: string, valor: number}>();
}