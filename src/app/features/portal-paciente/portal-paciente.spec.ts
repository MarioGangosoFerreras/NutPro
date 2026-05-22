import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalPaciente } from './portal-paciente';

describe('PortalPaciente', () => {
  let component: PortalPaciente;
  let fixture: ComponentFixture<PortalPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(PortalPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
