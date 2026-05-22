import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiEvolucion } from './mi-evolucion';

describe('MiEvolucion', () => {
  let component: MiEvolucion;
  let fixture: ComponentFixture<MiEvolucion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiEvolucion],
    }).compileComponents();

    fixture = TestBed.createComponent(MiEvolucion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
