import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoPaciente } from './nuevo-paciente';

describe('NuevoPaciente', () => {
  let component: NuevoPaciente;
  let fixture: ComponentFixture<NuevoPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
