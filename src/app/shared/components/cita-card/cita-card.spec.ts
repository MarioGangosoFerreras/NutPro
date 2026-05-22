import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitaCard } from './cita-card';

describe('CitaCard', () => {
  let component: CitaCard;
  let fixture: ComponentFixture<CitaCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitaCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CitaCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
