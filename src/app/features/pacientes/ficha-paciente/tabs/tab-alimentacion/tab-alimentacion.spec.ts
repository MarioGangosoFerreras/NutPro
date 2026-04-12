import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabAlimentacion } from './tab-alimentacion';

describe('TabAlimentacion', () => {
  let component: TabAlimentacion;
  let fixture: ComponentFixture<TabAlimentacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabAlimentacion],
    }).compileComponents();

    fixture = TestBed.createComponent(TabAlimentacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
