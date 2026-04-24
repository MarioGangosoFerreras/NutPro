import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanConfigurador } from './plan-configurador';

describe('PlanConfigurador', () => {
  let component: PlanConfigurador;
  let fixture: ComponentFixture<PlanConfigurador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanConfigurador],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanConfigurador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
