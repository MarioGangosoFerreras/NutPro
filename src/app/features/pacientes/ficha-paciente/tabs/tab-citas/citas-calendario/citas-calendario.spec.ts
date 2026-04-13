import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitasCalendario } from './citas-calendario';

describe('CitasCalendario', () => {
  let component: CitasCalendario;
  let fixture: ComponentFixture<CitasCalendario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitasCalendario],
    }).compileComponents();

    fixture = TestBed.createComponent(CitasCalendario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
