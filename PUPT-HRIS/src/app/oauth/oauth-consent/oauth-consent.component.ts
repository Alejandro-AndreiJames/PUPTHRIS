import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OAuthAuthService } from '../../services/oauth-auth.service';

@Component({
  selector: 'app-oauth-consent',
  templateUrl: './oauth-consent.component.html',
  styleUrl: './oauth-consent.component.css',
  standalone: true,
  imports: [CommonModule],
})
export class OAuthConsentComponent implements OnInit {
  clientName: string = '';
  isLoading = false;
  errorMessage: string = '';
  private oauthParams: any = {};

  constructor(
    private route: ActivatedRoute,
    private authService: OAuthAuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const { client_id, redirect_uri, state, response_type, user_id } = params;

      if (!client_id || !redirect_uri || !state || !response_type || !user_id) {
        this.errorMessage = 'Invalid OAuth request';
        return;
      }

      this.oauthParams = {
        client_id,
        redirect_uri,
        state,
        response_type,
        user_id,
      };
      this.loadClientInfo(client_id);
    });
  }

  private loadClientInfo(clientId: string) {
    this.authService.getClientInfo(clientId).subscribe({
      next: (info) => {
        this.clientName = info.name;
      },
      error: () => {
        this.errorMessage = 'Failed to load application information';
      },
    });
  }

  grantConsent() {
    this.isLoading = true;
    this.authService.grantConsent(this.oauthParams).subscribe({
      next: (response) => {
        if (response.redirect_url) {
          window.location.href = response.redirect_url;
        } else {
          this.errorMessage = 'Invalid response from server';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Consent error:', error);
        this.errorMessage =
          error.error?.error || error.error?.message || 'Authorization failed';
        this.isLoading = false;
      },
    });
  }

  denyConsent() {
    const redirectUri = new URL(this.oauthParams.redirect_uri);
    const stateWithParams = {
      originalState: this.oauthParams.state,
      originalParams: {
        client_id: this.oauthParams.client_id,
        redirect_uri: this.oauthParams.redirect_uri,
        state: this.oauthParams.state,
        response_type: this.oauthParams.response_type,
        user_id: this.oauthParams.user_id,
      },
    };

    redirectUri.searchParams.append('error', 'access_denied');
    redirectUri.searchParams.append(
      'state',
      btoa(JSON.stringify(stateWithParams))
    );
    window.location.href = redirectUri.toString();
  }
}
