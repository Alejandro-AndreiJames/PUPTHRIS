import { Component, OnInit } from '@angular/core';
import { TokenExpirationService } from '../services/token-expiration.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-token-expiration-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showWarning" class="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg">
      <div class="flex items-center">
        <div class="py-1">
          <svg class="h-6 w-6 text-yellow-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div>
          <p class="font-bold">Session Expiring Soon</p>
          <p class="text-sm">Your session will expire in 5 minutes. Please save your work and login again.</p>
        </div>
        <button (click)="logout()" class="ml-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
          Login Again
        </button>
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
      expiring => this.showWarning = expiring
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
