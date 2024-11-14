import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { UserService } from '../services/user.service';
import { CampusContextService } from '../services/campus-context.service';
import { finalize, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
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
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  showPassword: boolean = false;
  
  images = [
    { src: 'assets/Pylon.svg', alt: 'PUP Pylon' },
    { src: 'assets/loginAsset.svg', alt: 'PUP Taguig Campus' },
    { src: 'assets/SanJuan.svg', alt: 'PUP San Juan Campus' },
    { src: 'assets/Paranaque.svg', alt: 'PUP Paranaque Campus' },
  ];
  currentImageIndex = 0;
  private autoScrollInterval: any;
  isLoading: boolean = false;
  loginSuccess: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router,
    private userService: UserService,
    private campusContextService: CampusContextService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.startAutoScroll();
  }

  ngOnDestroy() {
    this.stopAutoScroll();
  }

  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      this.nextImage();
    }, 2000); // 2000ms = 2 seconds
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  hasPreviousImage(): boolean {
    return this.currentImageIndex > 0;
  }

  hasNextImage(): boolean {
    return this.currentImageIndex < this.images.length - 1;
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage() {
    this.stopAutoScroll();
    if (this.hasPreviousImage()) {
      this.currentImageIndex--;
    }
    this.startAutoScroll();
  }

  login() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      this.isLoading = true;
      this.loginSuccess = false;

      this.authService.login(email, password).pipe(
        switchMap(response => {
          console.log('Login successful, token:', response.token);
          localStorage.setItem('token', response.token);
          
          const decodedToken = this.authService.getDecodedToken();
          if (!decodedToken?.userId) {
            throw new Error('No user ID found in token');
          }
          
          return this.userService.getCurrentUserCampus(decodedToken.userId);
        }),
        finalize(() => {
          console.log('Login process completed');
        })
      ).subscribe({
        next: (campus) => {
          setTimeout(() => {
            this.loginSuccess = true;
            
            setTimeout(() => {
              if (campus?.CollegeCampusID) {
                console.log('Setting default campus ID:', campus.CollegeCampusID);
                this.campusContextService.setCampusId(campus.CollegeCampusID, true);
                
                setTimeout(() => {
                  this.isLoading = false;
                  this.router.navigate(['/dashboard']);
                }, 100);
              } else {
                console.warn('No campus ID found in response');
                this.isLoading = false;
                this.router.navigate(['/dashboard']);
              }
            }, 1500);
          }, 800);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login process failed:', error);
          if (error.message === 'No user ID found in token') {
            this.errorMessage = 'Authentication failed. Please try again.';
          } else {
            this.errorMessage = 'Invalid email or password. Please try again.';
          }
        }
      });
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  setCurrentImage(index: number) {
    this.stopAutoScroll();
    this.currentImageIndex = index;
    this.startAutoScroll();
  }
}
