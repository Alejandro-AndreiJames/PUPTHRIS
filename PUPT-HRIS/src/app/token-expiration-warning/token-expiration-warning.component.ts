import { Component, OnInit } from '@angular/core';
import { TokenExpirationService } from '../services/token-expiration.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-token-expiration-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showWarning" 
         class="fixed bottom-4 right-4 p-4 bg-[#FFF9E6] border-l-4 border-[#F5A623] rounded shadow-lg z-50 min-w-[400px]">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="fas fa-exclamation-triangle text-[#F5A623]"></i>
          <div>
            <h4 class="font-semibold text-[#8B572A]">Session Expired</h4>
            <p class="text-[#8B572A]">You have been logged out due to inactivity.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            (click)="loginAgain()" 
            class="px-4 py-2 bg-[#F5A623] text-white rounded hover:bg-[#E59819] transition-colors">
            Login Again
          </button>
          <button 
            (click)="closeWarning()" 
            class="p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class TokenExpirationWarningComponent implements OnInit {
  showWarning = false;

  constructor(
    private tokenService: TokenExpirationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.tokenService.tokenExpiring$.subscribe(
      expiring => {
        this.showWarning = expiring;
      }
    );
  }

  loginAgain() {
    this.router.navigate(['/login']);
  }

  closeWarning() {
    this.tokenService.closeWarning();
  }
}
