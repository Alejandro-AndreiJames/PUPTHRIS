import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OAuthAuthService } from '../../services/oauth-auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-oauth',
  templateUrl: './oauth-login.component.html',
  styleUrls: ['./oauth-login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class OAuthComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  clientId: string = '';
  errorMessage: string = '';
  oauthParams: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: OAuthAuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const { client_id, redirect_uri, state, response_type } = params;

      if (!client_id || !redirect_uri || !state || !response_type) {
        this.errorMessage = 'Invalid OAuth request';
        return;
      }

      this.clientId = client_id;
      this.oauthParams = { client_id, redirect_uri, state, response_type };
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginData = {
        ...this.loginForm.value,
        ...this.oauthParams,
      };

      this.authService.loginAndAuthorize(loginData).subscribe({
        next: (response) => {
          if (response.redirect_url) {
            window.location.href = response.redirect_url;
          } else if (response.user_id) {
            const queryParams = {
              ...this.oauthParams,
              user_id: response.user_id,
            };
            this.router.navigate(['/auth/oauth/consent'], { queryParams });
          } else {
            this.errorMessage = 'Invalid response from server';
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Login error:', error);
          if (error.status === 403) {
            this.errorMessage = 'Only faculty members can proceed.';
          } else {
            this.errorMessage =
              error.error?.error || error.error?.message || 'Login failed';
          }
          this.isLoading = false;
        },
      });
    }
  }
}
