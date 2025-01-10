import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LectureMaterial } from '../model/lecture-material.model';
import { CampusContextService } from '../services/campus-context.service';

@Injectable({
  providedIn: 'root'
})
export class LectureMaterialService {
  private apiUrl = `${environment.apiBaseUrl}/lecture-materials`;

  constructor(
    private http: HttpClient,
    private campusContextService: CampusContextService
  ) {}

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

  getLectureMaterials(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    viewMode: 'personal' | 'all' = 'all'
  ): Observable<any> {
    const selectedCampusId = this.campusContextService.getCurrentCampusId();
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search)
      .set('viewMode', viewMode);

    const headers = new HttpHeaders().set('selected-campus-id', selectedCampusId?.toString() || '');

    return this.http.get<any>(this.apiUrl, { params, headers });
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