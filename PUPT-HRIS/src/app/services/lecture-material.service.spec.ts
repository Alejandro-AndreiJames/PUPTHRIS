import { TestBed } from '@angular/core/testing';

import { LectureMaterialService } from './lecture-material.service';

describe('LectureMaterialService', () => {
  let service: LectureMaterialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LectureMaterialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
