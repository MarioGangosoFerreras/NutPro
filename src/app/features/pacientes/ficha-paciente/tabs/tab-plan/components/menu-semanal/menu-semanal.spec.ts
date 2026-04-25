import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuSemanal } from './menu-semanal';

describe('MenuSemanal', () => {
  let component: MenuSemanal;
  let fixture: ComponentFixture<MenuSemanal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuSemanal],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuSemanal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
