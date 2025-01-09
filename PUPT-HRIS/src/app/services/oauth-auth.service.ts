import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OAuthAuthService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  loginAndAuthorize(loginData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/oauth/login`, loginData, {
      headers: { 'X-Skip-Interceptor': 'true' },
    });
  }

  getClientInfo(clientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/oauth/client/${clientId}`, {
      headers: { 'X-Skip-Interceptor': 'true' },
    });
  }

  grantConsent(consentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/oauth/authorize`, consentData, {
      headers: { 'X-Skip-Interceptor': 'true' },
    });
  }
}
