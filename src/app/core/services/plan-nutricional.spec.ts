import { TestBed } from '@angular/core/testing';

import { PlanNutricional } from './plan-nutricional';

describe('PlanNutricional', () => {
  let service: PlanNutricional;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanNutricional);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
