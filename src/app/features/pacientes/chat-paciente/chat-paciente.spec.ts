import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatPaciente } from './chat-paciente';

describe('ChatPaciente', () => {
  let component: ChatPaciente;
  let fixture: ComponentFixture<ChatPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
