import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EmploymentInformation } from '../model/employment-information.model';

@Injectable({
  providedIn: 'root'
})
export class EmploymentInformationService {
  private apiUrl = `${environment.apiBaseUrl}/employment-information`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getEmploymentInfo(userId: number): Observable<EmploymentInformation> {
    return this.http.get<EmploymentInformation>(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  addEmploymentInfo(info: EmploymentInformation): Observable<EmploymentInformation> {
    return this.http.post<EmploymentInformation>(this.apiUrl, info, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateEmploymentInfo(userId: number, info: EmploymentInformation): Observable<EmploymentInformation> {
    return this.http.put<EmploymentInformation>(`${this.apiUrl}/${userId}`, info, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteEmploymentInfo(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}
