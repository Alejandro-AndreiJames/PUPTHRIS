import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CampusContextService {
  private campusIdSubject = new BehaviorSubject<number | null>(null);
  private readonly CAMPUS_ID_KEY = 'selectedCampusId';
  private readonly IS_DEFAULT_CAMPUS_KEY = 'isDefaultCampus';

  constructor(private injector: Injector) {
    console.log('CampusContextService - Service initialized');
    this.initializeCampus();
  }

  private initializeCampus(): void {
    const storedId = localStorage.getItem(this.CAMPUS_ID_KEY);
    if (storedId) {
      const campusId = parseInt(storedId, 10);
      console.log('CampusContextService - Initializing with stored ID:', campusId);
      // Ensure we emit the stored value immediately
      this.campusIdSubject.next(campusId);
    }
  }

  private getUserService(): UserService {
    return this.injector.get(UserService);
  }

  private getAuthService(): AuthService {
    return this.injector.get(AuthService);
  }

  initialize(): void {
    const storedCampusId = localStorage.getItem(this.CAMPUS_ID_KEY);
    if (storedCampusId) {
      this.setCampusId(parseInt(storedCampusId, 10));
      return;
    }

    const authService = this.getAuthService();
    const decodedToken = authService.getDecodedToken();
    if (decodedToken?.userId) {
      const userService = this.getUserService();
      userService.getCurrentUserCampus(decodedToken.userId).subscribe(
        campus => {
          if (campus?.CollegeCampusID) {
            this.setCampusId(campus.CollegeCampusID);
          }
        },
        error => console.error('Error fetching user campus:', error)
      );
    }
  }

  setCampusId(id: number, isDefault: boolean = false): void {
    console.log('CampusContextService - Setting campus ID:', id, 'isDefault:', isDefault);
    
    if (id && typeof id === 'number') {
      // Always set on first login
      localStorage.setItem(this.CAMPUS_ID_KEY, id.toString());
      localStorage.setItem(this.IS_DEFAULT_CAMPUS_KEY, isDefault.toString());
      
      // Ensure we emit the new value immediately
      this.campusIdSubject.next(id);
      console.log('CampusContextService - Campus ID set successfully, emitted:', id);
    } else {
      console.warn('CampusContextService - Invalid campus ID:', id);
    }
  }

  getCampusId(): Observable<number | null> {
    console.log('CampusContextService - Getting campus ID observable');
    return this.campusIdSubject.asObservable();
  }

  getCurrentCampusId(): number | null {
    const storedId = localStorage.getItem(this.CAMPUS_ID_KEY);
    console.log('CampusContextService - Current campus ID from storage:', storedId);
    return storedId ? parseInt(storedId, 10) : null;
  }

  clearCampusId(): void {
    localStorage.removeItem(this.CAMPUS_ID_KEY);
    localStorage.removeItem(this.IS_DEFAULT_CAMPUS_KEY);
    this.campusIdSubject.next(null);
  }

  updateCampus(id: number): void {
    console.log('CampusContextService - Manually updating campus to:', id);
    // When manually updating, always set isDefault to false
    this.setCampusId(id, false);
  }

  // New method to get the user's default campus
  getUserDefaultCampus(): Observable<number | null> {
    const decodedToken = this.getAuthService().getDecodedToken();
    if (decodedToken && decodedToken.userId) {
      return new Observable(observer => {
        const userService = this.getUserService();
        userService.getCurrentUserCampus(decodedToken.userId).subscribe(
          campus => {
            if (campus && campus.CollegeCampusID) {
              observer.next(campus.CollegeCampusID);
              observer.complete();
            } else {
              observer.next(null);
              observer.complete();
            }
          },
          error => {
            console.error('Error fetching user default campus:', error);
            observer.error(error);
          }
        );
      });
    } else {
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
  }
}
