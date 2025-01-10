import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ResearchPaper } from '../model/research-paper.model';
import { CampusContextService } from './campus-context.service';

interface ResearchPaperResponse {
  items: ResearchPaper[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResearchPaperService {
  private apiUrl = `${environment.apiBaseUrl}/research-papers`;
  private s3Config: any;

  constructor(
    private http: HttpClient,
    private campusContextService: CampusContextService
  ) {
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

  getResearchPapers(
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

    // Create headers with both Authorization and selected-campus-id
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${localStorage.getItem('token')}`)
      .set('selected-campus-id', selectedCampusId?.toString() || '');

    return this.http.get<any>(this.apiUrl, { params, headers });
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