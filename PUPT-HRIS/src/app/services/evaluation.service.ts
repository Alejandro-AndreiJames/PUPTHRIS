import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EvaluationCriteria } from '../model/evaluation-criteria.model';
import { FacultyEvaluation, EvaluationSubmission } from '../model/evaluation.model';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private apiUrl = `${environment.apiBaseUrl}/evaluation`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getEvaluationCriteria(): Observable<EvaluationCriteria[]> {
    return this.http.get<EvaluationCriteria[]>(`${this.apiUrl}/criteria`, { 
      headers: this.getHeaders() 
    }).pipe(catchError(this.handleError));
  }

  submitEvaluation(evaluation: EvaluationSubmission): Observable<any> {
    return this.http.post(`${this.apiUrl}/evaluations`, evaluation, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateEvaluationCriteria(id: number, criteria: EvaluationCriteria): Observable<any> {
    return this.http.patch(`${this.apiUrl}/criteria/${id}`, criteria, { 
      headers: this.getHeaders() 
    }).pipe(catchError(this.handleError));
  }

  deleteEvaluationCriteria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/criteria/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error.message || 'Server error');
  }
}