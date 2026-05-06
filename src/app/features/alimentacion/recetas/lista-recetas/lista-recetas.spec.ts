import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaRecetas } from './lista-recetas';

describe('ListaRecetas', () => {
  let component: ListaRecetas;
  let fixture: ComponentFixture<ListaRecetas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaRecetas],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaRecetas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
