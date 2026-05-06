import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendienteVerificacion } from './pendiente-verificacion';

describe('PendienteVerificacion', () => {
  let component: PendienteVerificacion;
  let fixture: ComponentFixture<PendienteVerificacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendienteVerificacion],
    }).compileComponents();

    fixture = TestBed.createComponent(PendienteVerificacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
