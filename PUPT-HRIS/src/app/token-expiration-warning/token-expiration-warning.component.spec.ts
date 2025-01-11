import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TokenExpirationWarningComponent } from './token-expiration-warning.component';

describe('TokenExpirationWarningComponent', () => {
  let component: TokenExpirationWarningComponent;
  let fixture: ComponentFixture<TokenExpirationWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TokenExpirationWarningComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TokenExpirationWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
