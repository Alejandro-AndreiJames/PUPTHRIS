import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, timer } from 'rxjs';
import { filter } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenExpirationService {
  private inactivityTimeout = 60 * 1000;  // 1 minute inactivity for testing
  private warningTime = 60 * 1000;        // Show warning 1 minute before token expires
  private lastActivity: number = Date.now();
  private inactivityTimer: any;
  private tokenExpiring = new BehaviorSubject<boolean>(false);
  tokenExpiring$ = this.tokenExpiring.asObservable();
  private warningType = new BehaviorSubject<'inactivity' | 'expiration' | null>(null);
  warningType$ = this.warningType.asObservable();
  private isLoginPage: boolean = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login';
      
      if (!this.isLoginPage) {
        this.startInactivityMonitoring();
        this.startTokenExpirationCheck();
      } else {
        this.stopInactivityMonitoring();
      }
    });

    timer(0, 5000).subscribe(() => {
      if (!this.isLoginPage) {
        this.checkInactivity();
        this.checkTokenExpiration();
      }
    });
  }

  private startTokenExpirationCheck() {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      const expirationTime = decodedToken.exp * 1000;
      const warningTime = expirationTime - this.warningTime;
      
      const timeUntilWarning = warningTime - Date.now();
      if (timeUntilWarning > 0) {
        setTimeout(() => {
          this.showTokenExpirationWarning();
        }, timeUntilWarning);
      }
    }
  }

  private showTokenExpirationWarning() {
    this.warningType.next('expiration');
    this.tokenExpiring.next(true);
  }

  private logoutDueToTokenExpiration() {
    localStorage.removeItem('token');
    this.tokenExpiring.next(false);
    setTimeout(() => {
      this.warningType.next('expiration');
      this.tokenExpiring.next(true);
      this.router.navigate(['/login']);
    }, 100);
  }

  private logoutDueToInactivity() {
    localStorage.removeItem('token');
    this.tokenExpiring.next(false);
    setTimeout(() => {
      this.warningType.next('inactivity');
      this.tokenExpiring.next(true);
      this.router.navigate(['/login']);
    }, 100);
  }

  private checkInactivity() {
    if (this.isLoginPage) return;

    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - this.lastActivity;

    if (timeSinceLastActivity >= this.inactivityTimeout) {
      this.logoutDueToInactivity();
    }
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

  public closeWarning() {
    this.tokenExpiring.next(false);
    this.warningType.next(null);
  }

  public resetActivity() {
    if (!this.isLoginPage) {
      this.resetInactivityTimer();
    }
  }

  private checkTokenExpiration() {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      const expirationTime = decodedToken.exp * 1000;
      
      if (Date.now() >= expirationTime) {
        this.logoutDueToTokenExpiration();
      }
    }
  }
}