import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaPacientesPreview } from './lista-pacientes-preview';

describe('ListaPacientesPreview', () => {
  let component: ListaPacientesPreview;
  let fixture: ComponentFixture<ListaPacientesPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPacientesPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaPacientesPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
