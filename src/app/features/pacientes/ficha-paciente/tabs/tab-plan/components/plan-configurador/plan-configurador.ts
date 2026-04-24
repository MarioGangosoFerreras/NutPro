import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, 
  IonSelect, IonSelectOption, IonInput, IonButton, IonIcon, IonToggle, IonSpinner, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calculatorOutline, saveOutline } from 'ionicons/icons';
import { FichaClinicaService } from '../../../../../../../core/services/ficha-clinica';
import { PlanNutricionalService } from '../../../../../../../core/services/plan-nutricional';

@Component({
  selector: 'app-plan-configurador',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonCard, IonCardHeader, IonCardTitle, 
    IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption, 
    IonInput, IonButton, IonIcon, IonToggle, IonSpinner
  ],
  templateUrl: './plan-configurador.html'
})
export class PlanConfiguradorComponent implements OnInit {
  @Input() paciente: any;
  
  // Setter para reaccionar cuando el plan llega desde la base de datos
  private _planActivo: any;
  @Input() set planActivo(value: any) {
    this._planActivo = value;
    if (value) {
      this.cargarPlan(value);
    }
  }
  get planActivo() {
    return this._planActivo;
  }

  @Output() guardado = new EventEmitter<any>();

  private fichaService = inject(FichaClinicaService);
  private planService = inject(PlanNutricionalService);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  guardando = false;
  peso = 0; 
  altura = 0; 
  edad = 0;
  
  // Variables del Formulario
  tipo = 'cuantitativo';
  factor_actividad = 1.2;
  objetivo = 'mantenimiento';
  tdee = 0;
  calorias_objetivo = 0;
  proteinas_g = 0; 
  carbohidratos_g = 0; 
  grasas_g = 0;

  constructor() {
    addIcons({ calculatorOutline, saveOutline });
  }

  async ngOnInit() {
    this.calcularEdad();
    
    try {
      // Cargamos las mediciones para tener peso y altura base
      const mediciones = await this.fichaService.getMediciones(this.paciente.id);
      if (mediciones && mediciones.length > 0) {
        const medPeso = mediciones.find((m: any) => m.peso_kg > 0);
        const medAltura = mediciones.find((m: any) => m.altura_cm > 0);
        this.peso = medPeso ? medPeso.peso_kg : 0;
        this.altura = medAltura ? medAltura.altura_cm : 0;
      }

      // Si al inicializar no hay plan cargado, sugerimos el cálculo inicial
      if (!this.planActivo) {
        this.recalcular();
      }
    } catch (error) {
      console.error('Error cargando datos del configurador:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  cargarPlan(plan: any) {
    this.tipo = plan.tipo;
    this.factor_actividad = plan.factor_actividad;
    this.objetivo = plan.objetivo;
    this.tdee = plan.gasto_energetico_base;
    this.calorias_objetivo = plan.calorias_objetivo;
    this.proteinas_g = plan.proteinas_g;
    this.carbohidratos_g = plan.carbohidratos_g;
    this.grasas_g = plan.grasas_g;
    this.cdr.detectChanges();
  }

  calcularEdad() {
    if (!this.paciente.fecha_nacimiento) return;
    const nac = new Date(this.paciente.fecha_nacimiento);
    this.edad = new Date().getFullYear() - nac.getFullYear();
  }

  recalcular() {
    if (!this.peso || !this.altura || !this.edad) return;

    // Ecuación de Mifflin-St Jeor
    let tmb = (10 * this.peso) + (6.25 * this.altura) - (5 * this.edad);
    tmb += (this.paciente.sexo === 'femenino') ? -161 : 5;

    this.tdee = Math.round(tmb * this.factor_actividad);

    // Ajuste por objetivo
    switch (this.objetivo) {
      case 'deficit_ligero': 
        this.calorias_objetivo = this.tdee - 300; 
        break;
      case 'deficit_moderado': 
        this.calorias_objetivo = this.tdee - 500; 
        break;
      case 'deficit_agresivo': 
        this.calorias_objetivo = this.tdee - 750; 
        break;
      case 'superavit': 
        this.calorias_objetivo = this.tdee + 400; 
        break;
      default: 
        this.calorias_objetivo = this.tdee;
    }

    this.repartirMacrosPorDefecto();
  }

  repartirMacrosPorDefecto() {
    this.proteinas_g = Math.round(this.peso * 2.0);
    this.grasas_g = Math.round(this.peso * 1.0);
    
    const kcalProt = this.proteinas_g * 4;
    const kcalGrasa = this.grasas_g * 9;
    const kcalRestantes = this.calorias_objetivo - (kcalProt + kcalGrasa);
    
    this.carbohidratos_g = kcalRestantes > 0 ? Math.round(kcalRestantes / 4) : 0;
  }

  async guardar() {
    this.guardando = true;
    try {
      const planForm = {
        tipo: this.tipo,
        objetivo: this.objetivo,
        factor_actividad: this.factor_actividad,
        gasto_energetico_base: this.tdee,
        calorias_objetivo: this.calorias_objetivo,
        proteinas_g: this.proteinas_g,
        grasas_g: this.grasas_g,
        carbohidratos_g: this.carbohidratos_g
      };

      const nuevoPlan = await this.planService.upsertPlan(this.paciente.id, planForm);
      this.guardado.emit(nuevoPlan);
      
      const toast = await this.toastCtrl.create({
        message: 'Plan guardado correctamente',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (e) {
      console.error(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }
}