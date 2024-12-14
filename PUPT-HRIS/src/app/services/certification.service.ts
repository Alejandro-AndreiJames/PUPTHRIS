import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Certification } from '../model/certification.model';

@Injectable({
  providedIn: 'root'
})
export class CertificationService {
  private apiUrl = `${environment.apiBaseUrl}/certifications`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getCertifications(userId: number): Observable<Certification[]> {
    return this.http.get<Certification[]>(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  addCertification(certification: Certification): Observable<Certification> {
    return this.http.post<Certification>(this.apiUrl, certification, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateCertification(id: number, certification: Certification): Observable<Certification> {
    return this.http.put<Certification>(`${this.apiUrl}/${id}`, certification, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteCertification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}
