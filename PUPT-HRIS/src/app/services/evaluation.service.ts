import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EvaluationCriteria } from '../model/evaluation-criteria.model';
import { FacultyEvaluation, EvaluationSubmission } from '../model/evaluation.model';
import { map } from 'rxjs/operators';

export interface EvaluationRatingCount {
  rating: string;
  count: number;
}

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

  getFacultyEvaluationHistory(facultyId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/evaluations/faculty/${facultyId}/history`, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  updateEvaluation(evaluationId: number, evaluation: EvaluationSubmission): Observable<any> {
    console.log('Updating evaluation:', evaluationId, evaluation);
    return this.http.put(`${this.apiUrl}/evaluations/${evaluationId}`, evaluation, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Update evaluation error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteEvaluation(evaluationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/evaluations/${evaluationId}`, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  getEvaluationRatingDistribution(
    campusId: number, 
    academicYear?: string, 
    semester?: string
  ): Observable<EvaluationRatingCount[]> {
    let url = `${this.apiUrl}/evaluations/ratings-distribution/${campusId}`;
    
    // Add query parameters if provided
    const params = new HttpParams()
      .set('academicYear', academicYear || '')
      .set('semester', semester || '');

    return this.http.get<EvaluationRatingCount[]>(url, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  getFacultiesByRating(
    campusId: number,
    rating: string,
    academicYear?: string,
    semester?: string
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('rating', rating)
      .set('academicYear', academicYear || '')
      .set('semester', semester || '');

    return this.http.get<any[]>(
      `${this.apiUrl}/evaluations/faculties-by-rating/${campusId}`,
      { headers: this.getHeaders(), params }
    ).pipe(catchError(this.handleError));
  }

  getImmunityEligibleFaculty(params: { 
    campusId: number, 
    departmentId?: number,
    immunityStatus?: 'immune' | 'pending'
  }): Observable<any[]> {
    let httpParams = new HttpParams()
      .set('campusId', params.campusId.toString());

    if (params.departmentId) {
      httpParams = httpParams.set('departmentId', params.departmentId.toString());
    }

    if (params.immunityStatus) {
      httpParams = httpParams.set('immunityStatus', params.immunityStatus);
    }

    return this.http.get<any[]>(`${this.apiUrl}/immunity-eligible`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      map(response => Array.isArray(response) ? response : []),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}