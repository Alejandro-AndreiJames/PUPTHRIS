import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ProfessionalLicense } from '../model/professional-license.model';

@Injectable({
  providedIn: 'root'
})
export class ProfessionalLicenseService {
  private apiUrl = `${environment.apiBaseUrl}/professional-licenses`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  addProfessionalLicense(license: ProfessionalLicense): Observable<ProfessionalLicense> {
    return this.http.post<ProfessionalLicense>(this.apiUrl, license, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateProfessionalLicense(id: number, license: ProfessionalLicense): Observable<ProfessionalLicense> {
    return this.http.put<ProfessionalLicense>(`${this.apiUrl}/${id}`, license, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getProfessionalLicenses(userId?: number): Observable<ProfessionalLicense[]> {
    const url = userId ? `${this.apiUrl}/${userId}` : this.apiUrl;
    return this.http.get<ProfessionalLicense[]>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteProfessionalLicense(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}
