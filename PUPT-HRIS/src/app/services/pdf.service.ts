import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private apiUrl = `${environment.apiBaseUrl}/faculty-profile/generate`;

  constructor(private http: HttpClient) { }

  generateFacultyProfilePdf(filters?: { 
    departmentId?: string,
    employmentType?: string,
    campusId?: number
  }): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters?.campusId !== undefined && filters?.campusId !== null) {
      params = params.set('campusId', Number(filters.campusId).toString());
    }

    if (filters?.departmentId && filters.departmentId !== 'all') {
      params = params.set('departmentId', filters.departmentId);
    }

    if (filters?.employmentType && filters.employmentType !== 'all') {
      params = params.set('employmentStatus', filters.employmentType);
    }

    return this.http.get(this.apiUrl, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
  }

  downloadPdf(blob: Blob, filename: string = 'faculty-profile.pdf'): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
