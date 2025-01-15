import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, timer } from 'rxjs';
import { filter } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenExpirationService {
  private inactivityTimeout = 10 * 1000; // 1 minute for testing
  private lastActivity: number = Date.now();
  private inactivityTimer: any;
  private tokenExpiring = new BehaviorSubject<boolean>(false);
  tokenExpiring$ = this.tokenExpiring.asObservable();
  private isLoginPage: boolean = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login';
      
      if (!this.isLoginPage) {
        this.startInactivityMonitoring();
      } else {
        this.stopInactivityMonitoring();
      }
    });

    timer(0, 5000).subscribe(() => {
      if (!this.isLoginPage) {
        this.checkInactivity();
      }
    });
  }

  private startInactivityMonitoring() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.resetInactivityTimer());
    });

    this.resetInactivityTimer();
  }

  private stopInactivityMonitoring() {
    clearTimeout(this.inactivityTimer);
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.removeEventListener(event, () => this.resetInactivityTimer());
    });
  }

  private resetInactivityTimer() {
    if (this.isLoginPage) return;
    
    this.lastActivity = Date.now();
    clearTimeout(this.inactivityTimer);
    
    this.inactivityTimer = setTimeout(() => {
      this.logoutDueToInactivity();
    }, this.inactivityTimeout);
  }

  private checkInactivity() {
    if (this.isLoginPage) return;

    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - this.lastActivity;

    if (timeSinceLastActivity >= this.inactivityTimeout) {
      this.logoutDueToInactivity();
    }
  }

  private logoutDueToInactivity() {
    localStorage.removeItem('token');
    this.tokenExpiring.next(true);
    this.router.navigate(['/login']);
  }

  public closeWarning() {
    this.tokenExpiring.next(false);
  }

  public resetActivity() {
    if (!this.isLoginPage) {
      this.resetInactivityTimer();
    }
  }
}