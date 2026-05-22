import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabDocumentos } from './tab-documentos';

describe('TabDocumentos', () => {
  let component: TabDocumentos;
  let fixture: ComponentFixture<TabDocumentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabDocumentos],
    }).compileComponents();

    fixture = TestBed.createComponent(TabDocumentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
