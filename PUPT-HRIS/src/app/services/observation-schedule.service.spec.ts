import { TestBed } from '@angular/core/testing';

import { ObservationScheduleService } from './observation-schedule.service';

describe('ObservationScheduleService', () => {
  let service: ObservationScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObservationScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
