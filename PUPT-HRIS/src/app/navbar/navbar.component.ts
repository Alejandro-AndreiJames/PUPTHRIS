import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { CampusContextService } from '../services/campus-context.service';
import { CollegeCampusService } from '../services/college-campus.service';
import { Subscription } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  userFirstName: string = '';
  currentCampus: string = '';
  private campusSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService, 
    private userService: UserService,
    private campusContextService: CampusContextService,
    private collegeCampusService: CollegeCampusService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.subscribeToCampusChanges();
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
  }

  loadUserInfo(): void {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      const userId = decoded.userId;
      
      if (userId) {
        this.userService.getUserById(userId).subscribe(
          (user) => {
            this.userFirstName = user.FirstName;
          },
          (error) => {
            console.error('Error fetching user data', error);
          }
        );
      }
    }
  }

  private subscribeToCampusChanges(): void {
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      campusId => {
        if (campusId) {
          this.collegeCampusService.getCollegeCampusById(campusId).subscribe(
            campus => {
              this.currentCampus = campus.Name;
            },
            error => {
              console.error('Error fetching campus details:', error);
            }
          );
        }
      }
    );
  }
}
