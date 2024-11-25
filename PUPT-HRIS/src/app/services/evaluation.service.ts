import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EvaluationCriteria } from '../model/evaluation-criteria.model';
import { FacultyEvaluation, EvaluationSubmission } from '../model/evaluation.model';
import { 
  RegularizationCandidate, 
  PerformanceReviewCandidate,
  CandidateFilterCriteria,
  CandidateSortOption 
} from '../model/evaluation-candidates.model';
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

  getRegularizationCandidates(campusId: number): Observable<RegularizationCandidate[]> {
    const params = new HttpParams().set('campusId', campusId.toString());
    
    return this.http.get<RegularizationCandidate[]>(
      `${this.apiUrl}/regularization-candidates`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(candidates => candidates.map(candidate => {
        const processedEvaluations = candidate.evaluations.map(evaluation => ({
          ...evaluation,
          score: this.convertToNumber(evaluation.score)
        }));

        const totalScore = processedEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
        const averageScore = processedEvaluations.length > 0 ? totalScore / processedEvaluations.length : 0;

        let recommendationStrength: 'Strong' | 'Moderate' | 'Weak';
        if (averageScore >= 93) {
          recommendationStrength = 'Strong';
        } else if (averageScore >= 85) {
          recommendationStrength = 'Moderate';
        } else {
          recommendationStrength = 'Weak';
        }

        return {
          ...candidate,
          evaluations: processedEvaluations,
          averageScore,
          recommendationStrength,
          eligibilityStatus: candidate.eligibilityStatus || { isEligible: true, reason: null }
        } as RegularizationCandidate;
      }))
    );
  }

  getPerformanceReviewCandidates(campusId: number): Observable<PerformanceReviewCandidate[]> {
    const params = new HttpParams().set('campusId', campusId.toString());
    
    return this.http.get<PerformanceReviewCandidate[]>(
      `${this.apiUrl}/performance-review-candidates`,
      { headers: this.getHeaders(), params }
    ).pipe(
      map(candidates => candidates.map(candidate => {
        // Process evaluations
        const processedEvaluations = candidate.evaluations.map(evaluation => ({
          ...evaluation,
          score: this.convertToNumber(evaluation.score)
        }));

        // Calculate metrics
        const scores = processedEvaluations.map(e => e.score);
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;
        const lowestScore = Math.min(...scores);

        // Calculate trend
        let trend: 'Improving' | 'Declining' | 'Stable';
        if (scores.length >= 2) {
          const lastScore = scores[0];
          const previousScore = scores[1];
          if (lastScore > previousScore) trend = 'Improving';
          else if (lastScore < previousScore) trend = 'Declining';
          else trend = 'Stable';
        } else {
          trend = 'Stable';
        }

        // Calculate concern level
        let concernLevel: 'High' | 'Moderate' | 'Low';
        if (lowestScore < 75) concernLevel = 'High';
        else if (lowestScore < 85) concernLevel = 'Moderate';
        else concernLevel = 'Low';

        return {
          ...candidate,
          evaluations: processedEvaluations,
          performanceMetrics: {
            trend,
            concernLevel,
            lowestScore,
            averageScore
          },
          reviewStatus: {
            needsImmediate: concernLevel === 'High' || trend === 'Declining'
          }
        } as PerformanceReviewCandidate;
      }))
    );
  }

  // Helper method to safely convert values to numbers
  private convertToNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}