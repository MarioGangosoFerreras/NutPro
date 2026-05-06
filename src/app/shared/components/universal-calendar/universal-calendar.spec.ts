import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversalCalendar } from './universal-calendar';

describe('UniversalCalendar', () => {
  let component: UniversalCalendar;
  let fixture: ComponentFixture<UniversalCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniversalCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(UniversalCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
