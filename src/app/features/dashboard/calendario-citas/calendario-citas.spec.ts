import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioCitas } from './calendario-citas';

describe('CalendarioCitas', () => {
  let component: CalendarioCitas;
  let fixture: ComponentFixture<CalendarioCitas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarioCitas],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarioCitas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
