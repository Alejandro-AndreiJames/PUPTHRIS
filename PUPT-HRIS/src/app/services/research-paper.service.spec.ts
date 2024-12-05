import { TestBed } from '@angular/core/testing';

import { ResearchPaperService } from './research-paper.service';

describe('ResearchPaperService', () => {
  let service: ResearchPaperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResearchPaperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
