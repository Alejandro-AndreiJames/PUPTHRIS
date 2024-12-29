import { TestBed } from '@angular/core/testing';

import { ProfessionalLicenseService } from './professional-license.service';

describe('ProfessionalLicenseService', () => {
  let service: ProfessionalLicenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfessionalLicenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
