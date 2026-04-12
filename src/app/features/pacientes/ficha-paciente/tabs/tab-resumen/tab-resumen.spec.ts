import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabResumen } from './tab-resumen';

describe('TabResumen', () => {
  let component: TabResumen;
  let fixture: ComponentFixture<TabResumen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabResumen],
    }).compileComponents();

    fixture = TestBed.createComponent(TabResumen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
