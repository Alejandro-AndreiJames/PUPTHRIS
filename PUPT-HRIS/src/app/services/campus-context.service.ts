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
    this.initializeCampus();
  }

  private initializeCampus(): void {
    const storedId = localStorage.getItem(this.CAMPUS_ID_KEY);
    if (storedId) {
      const campusId = parseInt(storedId, 10);
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
    if (id && typeof id === 'number') {
      localStorage.setItem(this.CAMPUS_ID_KEY, id.toString());
      localStorage.setItem(this.IS_DEFAULT_CAMPUS_KEY, isDefault.toString());
      this.campusIdSubject.next(id);
    }
  }

  getCampusId(): Observable<number | null> {
    return this.campusIdSubject.asObservable();
  }

  getCurrentCampusId(): number | null {
    const storedId = localStorage.getItem(this.CAMPUS_ID_KEY);
    return storedId ? parseInt(storedId, 10) : null;
  }

  clearCampusId(): void {
    localStorage.removeItem(this.CAMPUS_ID_KEY);
    localStorage.removeItem(this.IS_DEFAULT_CAMPUS_KEY);
    this.campusIdSubject.next(null);
  }

  updateCampus(id: number): void {
    this.setCampusId(id, false);
  }

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
