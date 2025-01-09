import { TestBed } from '@angular/core/testing';

import { OAuthAuthService } from './oauth-auth.service';

describe('OAuthAuthService', () => {
  let service: OAuthAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OAuthAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
