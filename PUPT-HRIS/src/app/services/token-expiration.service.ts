import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, timer } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenExpirationService {
  private warningThreshold = 5 * 60; // 5 minutes warning before expiration
  private tokenExpiring = new BehaviorSubject<boolean>(false);
  tokenExpiring$ = this.tokenExpiring.asObservable();

  constructor(private router: Router) {
    timer(0, 60000).subscribe(() => { // Check every minute
      this.checkTokenExpiration();
    });
  }

  checkTokenExpiration() {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = decodedToken.exp - currentTime;

      if (timeUntilExpiration <= 0) {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
        return;
      }

      if (timeUntilExpiration <= this.warningThreshold) {
        this.tokenExpiring.next(true);
      } else {
        this.tokenExpiring.next(false);
      }

    } catch (error) {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }
  }
}
