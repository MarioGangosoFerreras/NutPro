import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabClinica } from './tab-clinica';

describe('TabClinica', () => {
  let component: TabClinica;
  let fixture: ComponentFixture<TabClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabClinica],
    }).compileComponents();

    fixture = TestBed.createComponent(TabClinica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
