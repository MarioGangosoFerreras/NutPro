import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleReceta } from './detalle-receta';

describe('DetalleReceta', () => {
  let component: DetalleReceta;
  let fixture: ComponentFixture<DetalleReceta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleReceta],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleReceta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
