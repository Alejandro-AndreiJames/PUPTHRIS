import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { CampusContextService } from '../services/campus-context.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeItem: string = '';
  isProfileDropdownOpen: boolean = false;
  roles: string[] = [];
  isReportsDropdownOpen: boolean = false;
  isReportsActive: boolean = false;
  private userDefaultCampusId: number | null = null;
  private currentCampusId: number | null = null;
  private campusSubscription: Subscription = new Subscription();
  isSuperAdmin: boolean = false;
  isMaintenanceDropdownOpen: boolean = false;
  isMaintenanceActive: boolean = false;

  showLogoutModal: boolean = false;
  isLoggingOut: boolean = false;
  showSuccessMessage: boolean = false;

  constructor(
    private router: Router,
    private campusContextService: CampusContextService,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setActiveItemBasedOnRoute(event.urlAfterRedirects);
      }
    });
  }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.roles = decodedToken.roles;
      this.isSuperAdmin = this.roles.includes('superadmin');
    }

    // Set active item based on the initial route
    this.setActiveItemBasedOnRoute(this.router.url);

    // Combine observables for default campus and current campus
    this.campusSubscription = combineLatest([
      this.campusContextService.getUserDefaultCampus(),
      this.campusContextService.getCampusId()
    ]).subscribe(([defaultCampusId, currentCampusId]) => {
      this.userDefaultCampusId = defaultCampusId;
      this.currentCampusId = currentCampusId;
      this.updateCurrentCampus();
      this.cdr.detectChanges(); // Force change detection
    });
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  // Sidebar items visibility logic
  get canManageDepartments(): boolean {
    return this.isSuperAdmin || this.hasRole('admin');
  }

  get canManageEmployees(): boolean {
    return this.isSuperAdmin || this.hasRole('admin');
  }

  get canAccessProfile(): boolean {
    return this.hasRole('faculty') || this.hasRole('staff') || this.hasRole('admin') || this.hasRole('superadmin');
  }

  get canManageUserManagement(): boolean {
    return this.hasRole('superadmin') || this.hasRole('admin');
  }

  get isProfileActive(): boolean {
    // This method determines if the profile section should be active or not
    return this.activeItem.startsWith('my-profile') || this.isProfileDropdownOpen;
  }

  setActive(item: string) {
    this.activeItem = item;
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    if (this.isProfileDropdownOpen) {
      this.activeItem = 'my-profile';
    } else if (this.activeItem.startsWith('my-profile')) {
      this.activeItem = '';
    }
  }

  setActiveItemBasedOnRoute(url: string) {
    if (url.includes('dashboard')) {
      this.activeItem = 'dashboard';
    } else if (url.includes('departments')) {
      this.activeItem = 'department-management';
    } else if (url.includes('user-management')) {
      this.activeItem = 'user-management';
    } else if (url.includes('employees')) {
      this.activeItem = 'employees';
    } else if (url.includes('new-account')) {
      this.activeItem = 'new-account';
    } else if (url.includes('basic-details')) {
      this.activeItem = 'my-profile-basic-details';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('personal-details')) {
      this.activeItem = 'my-profile-personal-details';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('educational-background')) {
      this.activeItem = 'my-profile-educational-background';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('trainings-and-seminars')) {
      this.activeItem = 'my-profile-trainings-and-seminars';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('outstanding-achievement')) {
      this.activeItem = 'my-profile-outstanding-achievement';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('officer-membership')) {
      this.activeItem = 'my-profile-officer-membership';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('settings')) {
      this.activeItem = 'settings';
    } else if (url.includes('coordinator-management')) {
      this.activeItem = 'coordinator-management';
    } else if (url.includes('college-campuses')) {
      this.activeItem = 'college-campus-management';
      this.isMaintenanceDropdownOpen = true;
      this.isMaintenanceActive = true;
    } else if (url.includes('college-campuses') || url.includes('departments') || 
               url.includes('coordinator-management') || url.includes('user-management')) {
      this.isMaintenanceDropdownOpen = true;
      this.isMaintenanceActive = true;
    } else if (url.includes('evaluation')) {
      this.isReportsDropdownOpen = true;
      this.isReportsActive = true;
    } else if (url.includes('resources')) {
      this.activeItem = 'resources';
    } else if (url.includes('professional-license')) {
      this.activeItem = 'my-profile-professional-license';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('employment-information')) {
      this.activeItem = 'my-profile-employment-information';
      this.isProfileDropdownOpen = true;
    } else if (url.includes('certification')) {
      this.activeItem = 'my-profile-certification';
      this.isProfileDropdownOpen = true;
    } else {
      this.activeItem = '';
    }
  }

  toggleReportsDropdown() {
    this.isReportsDropdownOpen = !this.isReportsDropdownOpen;
    this.isReportsActive = this.isReportsDropdownOpen;
    if (!this.isReportsDropdownOpen) {
      if (this.activeItem === 'evaluation' ||
          this.activeItem === 'print-pds') {
        this.activeItem = '';
      }
    }
  }
  logout() {
    this.showLogoutModal = true;
  }
  cancelLogout() {
    this.showLogoutModal = false;
  }
  async confirmLogout() {
    this.isLoggingOut = true;
    
    try {
      // Simulate logout process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.removeItem('token');
      this.showLogoutModal = false;
      this.isLoggingOut = false;
      
      // Show success modal
      this.showSuccessMessage = true;
      
      // Navigate after showing message
      setTimeout(() => {
        this.showSuccessMessage = false;
        this.router.navigate(['/login']);
      }, 1500);
      
    } catch (error) {
      this.isLoggingOut = false;
      console.error('Logout error:', error);
    }
  }

  get canManageCoordinators(): boolean {
    return this.isSuperAdmin || this.hasRole('admin');
  }

  get canManageCollegeCampuses(): boolean {
    return this.isSuperAdmin;
  }

  private updateCurrentCampus(): void {
    console.log('Current campus updated:', this.currentCampusId);
    console.log('Default campus:', this.userDefaultCampusId);
    console.log('Is Super Admin:', this.isSuperAdmin);
    console.log('Can manage users:', this.canManageUsers);
    // Implement any logic that depends on the current campus
  }

  get canAddNewAccount(): boolean {
    return this.isSuperAdmin || (this.hasRole('admin') && this.currentCampusId === this.userDefaultCampusId);
  }

  get canManageUsers(): boolean {
    return this.isSuperAdmin || (this.hasRole('admin') && this.currentCampusId === this.userDefaultCampusId);
  }

  get canAccessEvaluation(): boolean {
    return this.hasRole('admin') || this.hasRole('superadmin');
  }

  get showMaintenanceMenu(): boolean {
    return this.canManageCollegeCampuses || this.canManageDepartments || 
           this.canManageCoordinators || this.canManageUsers;
  }

  get showReportsMenu(): boolean {
    return this.canAccessEvaluation;
  }

  toggleMaintenanceDropdown() {
    this.isMaintenanceDropdownOpen = !this.isMaintenanceDropdownOpen;
    this.isMaintenanceActive = this.isMaintenanceDropdownOpen;
    if (!this.isMaintenanceDropdownOpen) {
      if (this.activeItem === 'college-campus-management' ||
          this.activeItem === 'department-management' ||
          this.activeItem === 'coordinator-management' ||
          this.activeItem === 'user-management') {
        this.activeItem = '';
      }
    }
  }

  get canAccessResources(): boolean {
    return this.hasRole('faculty') || this.hasRole('admin') || this.hasRole('superadmin');
  }
}
