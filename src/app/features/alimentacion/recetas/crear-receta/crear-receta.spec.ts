import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearReceta } from './crear-receta';

describe('CrearReceta', () => {
  let component: CrearReceta;
  let fixture: ComponentFixture<CrearReceta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearReceta],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearReceta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
