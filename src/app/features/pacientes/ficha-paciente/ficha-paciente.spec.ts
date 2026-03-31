import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaPaciente } from './ficha-paciente';

describe('FichaPaciente', () => {
  let component: FichaPaciente;
  let fixture: ComponentFixture<FichaPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(FichaPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
