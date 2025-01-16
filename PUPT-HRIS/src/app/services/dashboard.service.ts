import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

export interface UserDashboardData {
  department: string;
  academicRank: string;
  employmentType: string;
  activityCounts: {
    trainings: number;
    awards: number;
    voluntaryActivities: number;
    officershipMemberships: number;
  };
}

export interface UpcomingBirthday {
  FirstName: string;
  LastName: string;
  DateOfBirth: Date;
}

export interface GovernmentIdCounts {
  governmentIds: {
    gsis: number;
    pagIbig: number;
    philHealth: number;
    sss: number;
    tin: number;
    agencyEmployee: number;
  };
}

interface ProfileCompletionResponse {
  completionPercentage: number;
  incompleteSections: string[];
  completedSections: number;
  totalSections: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiBaseUrl}/dashboard`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getDashboardData(campusId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard-data`, { params: { campusId: campusId.toString() }, headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getUserDashboardData(userId: number): Observable<UserDashboardData> {
    const headers = this.getHeaders();
    return this.http.get<UserDashboardData>(`${this.apiUrl}/user-dashboard-data/${userId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getUpcomingBirthdays(): Observable<UpcomingBirthday[]> {
    return this.http.get<UpcomingBirthday[]>(`${this.apiUrl}/upcoming-birthdays`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getAgeGroupData(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/age-group-data`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // New method to get profile completion percentage
  getProfileCompletion(userId: number): Observable<ProfileCompletionResponse> {
    return this.http.get<ProfileCompletionResponse>(
      `${this.apiUrl}/profile-completion/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getGovernmentIdCounts(campusId: number): Observable<GovernmentIdCounts> {
    return this.http.get<GovernmentIdCounts>(`${this.apiUrl}/government-id-counts`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getFemaleUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/female-users`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getMaleUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/male-users`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getFacultyUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/faculty-users`, {
      params: { campusId: campusId.toString() }
    });
  }

  getStaffUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/staff-users`, {
      params: { campusId: campusId.toString() }
    });
  }

  getDoctorateUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctorate-users`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getMastersUsers(campusId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/masters-users`, {
      params: { campusId: campusId.toString() },
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.message || 'Server error');
  }
}
