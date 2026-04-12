import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabMediciones } from './tab-mediciones';

describe('TabMediciones', () => {
  let component: TabMediciones;
  let fixture: ComponentFixture<TabMediciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabMediciones],
    }).compileComponents();

    fixture = TestBed.createComponent(TabMediciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
