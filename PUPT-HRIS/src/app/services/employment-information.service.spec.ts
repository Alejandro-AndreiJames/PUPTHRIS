import { TestBed } from '@angular/core/testing';

import { EmploymentInformationService } from './employment-information.service';

describe('EmploymentInformationService', () => {
  let service: EmploymentInformationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmploymentInformationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
