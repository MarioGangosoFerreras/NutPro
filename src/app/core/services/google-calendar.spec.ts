import { TestBed } from '@angular/core/testing';

import { GoogleCalendar } from './google-calendar';

describe('GoogleCalendar', () => {
  let service: GoogleCalendar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleCalendar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
