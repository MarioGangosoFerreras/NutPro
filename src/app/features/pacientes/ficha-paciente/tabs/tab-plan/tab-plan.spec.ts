import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabPlan } from './tab-plan';

describe('TabPlan', () => {
  let component: TabPlan;
  let fixture: ComponentFixture<TabPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabPlan],
    }).compileComponents();

    fixture = TestBed.createComponent(TabPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
