import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitasLista } from './citas-lista';

describe('CitasLista', () => {
  let component: CitasLista;
  let fixture: ComponentFixture<CitasLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitasLista],
    }).compileComponents();

    fixture = TestBed.createComponent(CitasLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
