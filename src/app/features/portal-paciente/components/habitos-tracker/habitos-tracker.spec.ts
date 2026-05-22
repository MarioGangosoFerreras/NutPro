import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HabitosTracker } from './habitos-tracker';

describe('HabitosTracker', () => {
  let component: HabitosTracker;
  let fixture: ComponentFixture<HabitosTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitosTracker],
    }).compileComponents();

    fixture = TestBed.createComponent(HabitosTracker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
