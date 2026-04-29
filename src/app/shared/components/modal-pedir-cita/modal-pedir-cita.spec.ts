import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPedirCita } from './modal-pedir-cita';

describe('ModalPedirCita', () => {
  let component: ModalPedirCita;
  let fixture: ComponentFixture<ModalPedirCita>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPedirCita],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalPedirCita);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
