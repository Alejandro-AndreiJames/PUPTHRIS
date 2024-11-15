import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { CampusContextService } from '../services/campus-context.service';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CampusGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private campusContextService: CampusContextService
  ) {}

  canActivate() {
    console.log('CampusGuard - Starting guard check');
    
    // First check if we already have a stored campus ID
    const currentCampusId = this.campusContextService.getCurrentCampusId();
    const isDefault = localStorage.getItem('isDefaultCampus');
    
    if (currentCampusId && isDefault !== 'true') {
      console.log('CampusGuard - Using existing manual campus ID:', currentCampusId);
      return true;
    }

    const decodedToken = this.authService.getDecodedToken();
    console.log('CampusGuard - Decoded token:', decodedToken);

    if (!decodedToken?.userId) {
      console.error('CampusGuard - No userId found in token');
      return false;
    }

    return this.userService.getCurrentUserCampus(decodedToken.userId).pipe(
      tap(campus => {
        console.log('CampusGuard - Received campus data:', campus);
        if (campus?.CollegeCampusID) {
          // Only set if we don't have a stored campus or if it's marked as default
          if (!currentCampusId || isDefault === 'true') {
            console.log('CampusGuard - Setting default campus ID:', campus.CollegeCampusID);
            this.campusContextService.setCampusId(campus.CollegeCampusID, true);
          } else {
            console.log('CampusGuard - Keeping existing manual campus selection:', currentCampusId);
          }
        } else {
          console.warn('CampusGuard - No CollegeCampusID found in response');
        }
      }),
      map(campus => {
        const hasAccess = !!campus?.CollegeCampusID;
        console.log('CampusGuard - Access granted:', hasAccess);
        return hasAccess;
      }),
      catchError(error => {
        console.error('CampusGuard - Error fetching campus:', error);
        return of(false);
      })
    );
  }
}