import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisDocumentos } from './mis-documentos';

describe('MisDocumentos', () => {
  let component: MisDocumentos;
  let fixture: ComponentFixture<MisDocumentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisDocumentos],
    }).compileComponents();

    fixture = TestBed.createComponent(MisDocumentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
