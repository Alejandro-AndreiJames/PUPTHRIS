import { TestBed } from '@angular/core/testing';

import { TokenExpirationService } from './token-expiration.service';

describe('TokenExpirationService', () => {
  let service: TokenExpirationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenExpirationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
