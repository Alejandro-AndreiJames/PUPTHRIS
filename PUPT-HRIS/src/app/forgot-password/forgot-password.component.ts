import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('500ms', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm: FormGroup;
  errorMessage: string | null = null;
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  private autoScrollInterval: any;
  currentImageIndex = 0;

  images = [
    { src: 'assets/Pylon.svg', alt: 'PUP Pylon' },
    { src: 'assets/loginAsset.svg', alt: 'PUP Taguig Campus' },
    { src: 'assets/SanJuan.svg', alt: 'PUP San Juan Campus' },
    { src: 'assets/Paranaque.svg', alt: 'PUP Paranaque Campus' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.startAutoScroll();
  }

  ngOnDestroy() {
    this.stopAutoScroll();
  }

  // Add carousel methods
  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      this.nextImage();
    }, 2000);
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage() {
    this.stopAutoScroll();
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
    this.startAutoScroll();
  }

  setCurrentImage(index: number) {
    this.stopAutoScroll();
    this.currentImageIndex = index;
    this.startAutoScroll();
  }

  // Existing methods...
  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.value;
      this.authService.forgotPassword(email)
        .subscribe({
          next: (response: any) => {
            console.log('Password reset link sent:', response.message);
            this.showToastNotification('Password reset link sent. Please check your email.', 'success');
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          },
          error: (error) => {
            console.error('Password reset failed', error);
            this.showToastNotification('Failed to send password reset link. Please try again.', 'error');
          }
        });
    } else {
      console.error('Form is invalid');
      this.showToastNotification('Please enter a valid email address.', 'warning');
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
