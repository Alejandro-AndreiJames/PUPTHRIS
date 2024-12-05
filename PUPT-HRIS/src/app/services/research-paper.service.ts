import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ResearchPaper } from '../model/research-paper.model';

@Injectable({
  providedIn: 'root'
})
export class ResearchPaperService {
  private apiUrl = `${environment.apiBaseUrl}/research-papers`;
  private s3Config: any;

  constructor(private http: HttpClient) {
    this.getS3Config().subscribe(
      config => this.s3Config = config
    );
  }

  getS3Config() {
    return this.http.get<any>(`${environment.apiBaseUrl}/config/s3-config`);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  addResearchPaper(data: FormData): Observable<ResearchPaper> {
    return this.http.post<ResearchPaper>(this.apiUrl, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateResearchPaper(id: number, data: FormData): Observable<ResearchPaper> {
    return this.http.put<ResearchPaper>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getResearchPapers(userId?: number): Observable<ResearchPaper[]> {
    const url = userId ? `${this.apiUrl}/${userId}` : this.apiUrl;
    return this.http.get<ResearchPaper[]>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteResearchPaper(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}