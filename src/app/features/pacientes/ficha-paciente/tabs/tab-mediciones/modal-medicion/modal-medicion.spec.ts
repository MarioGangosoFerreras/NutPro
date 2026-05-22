import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalMedicion } from './modal-medicion';

describe('ModalMedicion', () => {
  let component: ModalMedicion;
  let fixture: ComponentFixture<ModalMedicion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalMedicion],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalMedicion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
