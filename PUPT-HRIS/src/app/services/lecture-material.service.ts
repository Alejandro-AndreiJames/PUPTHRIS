import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LectureMaterial } from '../model/lecture-material.model';

@Injectable({
  providedIn: 'root'
})
export class LectureMaterialService {
  private apiUrl = `${environment.apiBaseUrl}/lecture-materials`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  addLectureMaterial(data: FormData): Observable<LectureMaterial> {
    return this.http.post<LectureMaterial>(this.apiUrl, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateLectureMaterial(id: number, data: FormData): Observable<LectureMaterial> {
    return this.http.put<LectureMaterial>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getLectureMaterials(userId?: number): Observable<LectureMaterial[]> {
    const url = userId ? `${this.apiUrl}/${userId}` : this.apiUrl;
    return this.http.get<LectureMaterial[]>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteLectureMaterial(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getS3Config(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/config/s3-config`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}