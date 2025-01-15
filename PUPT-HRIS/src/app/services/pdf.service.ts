import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private apiUrl = `${environment.apiBaseUrl}/faculty-profile/generate`;

  constructor(private http: HttpClient) { }

  generateFacultyProfilePdf(): Observable<Blob> {
    return this.http.get(this.apiUrl, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
        'Content-Type': 'application/json'
      }
    });
  }

  openPdfInNewTab(blob: Blob): void {
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  }
}
