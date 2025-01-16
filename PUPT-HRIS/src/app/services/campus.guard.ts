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
    const currentCampusId = this.campusContextService.getCurrentCampusId();
    const isDefault = localStorage.getItem('isDefaultCampus');
    
    if (currentCampusId && isDefault !== 'true') {
      return true;
    }

    const decodedToken = this.authService.getDecodedToken();

    if (!decodedToken?.userId) {
      return false;
    }

    return this.userService.getCurrentUserCampus(decodedToken.userId).pipe(
      tap(campus => {
        if (campus?.CollegeCampusID) {
          if (!currentCampusId || isDefault === 'true') {
            this.campusContextService.setCampusId(campus.CollegeCampusID, true);
          }
        }
      }),
      map(campus => {
        return !!campus?.CollegeCampusID;
      }),
      catchError(error => {
        return of(false);
      })
    );
  }
}