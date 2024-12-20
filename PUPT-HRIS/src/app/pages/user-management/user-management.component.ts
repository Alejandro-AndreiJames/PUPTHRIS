import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserManagementService } from '../../services/user-management.service';
import { User } from '../../model/user.model';
import { Role } from '../../model/role.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface UserResponse {
  data: User[];
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  }
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  availableRoles: Role[] = [];
  employmentTypes: string[] = ['fulltime', 'parttime', 'temporary', 'designee'];
  campusId: number | null = null;
  private campusSubscription: Subscription | undefined;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  loading: boolean = false;

  visiblePages: number = 5; // Number of page buttons to show

  displayedUsers: User[] = [];

  originalUserStates: Map<number, { roles: number[], employmentType: string }> = new Map();
  modifiedUsers: Set<number> = new Set();

  paginatedUsers: User[] = []; // To hold the users for the current page

  selectedEmploymentType: string = '';
  selectedRole: string = '';

  private searchSubject = new Subject<string>();
  private readonly DEBOUNCE_TIME = 300; // 300ms delay

  constructor(
    private userManagementService: UserManagementService,
    private campusContextService: CampusContextService
  ) {
    this.searchSubject.pipe(
      debounceTime(this.DEBOUNCE_TIME),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.currentPage = 1; // Reset to first page
      this.fetchUsers();
    });
  }

  ngOnInit(): void {
    console.log('UserManagementComponent initialized');
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      id => {
        console.log('Received campus ID in UserManagementComponent:', id);
        if (id !== null) {
          this.campusId = id;
          this.fetchUsers();
        } else {
          console.log('Campus ID is null, not fetching users');
        }
      },
      error => {
        console.error('Error getting campus ID:', error);
      }
    );
    this.fetchAvailableRoles();
    this.logEmploymentTypes();
    this.updatePaginatedData();
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
    this.searchSubject.complete();
  }

  private initializePagination(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.updatePaginatedData();
  }

  fetchUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    
    this.loading = true;
    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      campusId: this.campusId,
      search: this.searchTerm || '',
      employmentType: this.selectedEmploymentType || '',
      role: this.selectedRole || ''
    };

    this.userManagementService.getAllUsers(params).subscribe({
      next: (response: UserResponse) => {
        this.users = response.data;
        this.filteredUsers = [...this.users];
        this.paginatedUsers = this.filteredUsers;
        this.totalItems = response.metadata.totalItems;
        this.totalPages = response.metadata.totalPages;
        
        // Initialize original states for new users
        this.paginatedUsers.forEach(user => {
          if (!this.originalUserStates.has(user.UserID)) {
            this.originalUserStates.set(user.UserID, {
              roles: user.Roles.map(role => role.RoleID),
              employmentType: user.EmploymentType
            });
          }
        });
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  fetchAvailableRoles(): void {
    this.userManagementService.getAllRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles;
      },
      error: (error) => {
        console.error('Error fetching roles', error);
        this.showToastNotification('Error fetching roles', 'error');
      },
    });
  }

  logEmploymentTypes(): void {
    console.log('Available Employment Types:', this.employmentTypes);
  }

  isUserRoleSelected(user: User, roleID: number): boolean {
    return user.Roles && user.Roles.some(role => role.RoleID === roleID);
  }

  toggleUserRole(user: User, roleID: number): void {
    if (this.isUserRoleSelected(user, roleID)) {
      user.Roles = user.Roles.filter(role => role.RoleID !== roleID);
    } else {
      const roleToAdd = this.availableRoles.find(role => role.RoleID === roleID);
      if (roleToAdd) {
        user.Roles.push(roleToAdd);
      }
    }
    this.checkForChanges(user);
  }

  onEmploymentTypeChange(): void {
    this.currentPage = 1; // Reset to first page
    this.fetchUsers();
  }

  onRoleChange(): void {
    this.currentPage = 1; // Reset to first page
    this.fetchUsers();
  }

  public checkForChanges(user: User): void {
    const originalState = this.originalUserStates.get(user.UserID);
    if (!originalState) return;

    const currentRoles = user.Roles.map(role => role.RoleID).sort().toString();
    const originalRoles = originalState.roles.sort().toString();
    const hasChanges = 
      currentRoles !== originalRoles || 
      user.EmploymentType !== originalState.employmentType;

    if (hasChanges) {
      this.modifiedUsers.add(user.UserID);
    } else {
      this.modifiedUsers.delete(user.UserID);
    }
  }

  hasUserChanges(user: User): boolean {
    return this.modifiedUsers.has(user.UserID);
  }

  saveUserDetails(user: User): void {
    this.saveEmploymentType(user);
    this.saveUserRoles(user);
    
    this.originalUserStates.set(user.UserID, {
      roles: user.Roles.map(role => role.RoleID),
      employmentType: user.EmploymentType
    });
    this.modifiedUsers.delete(user.UserID);
  }

  saveEmploymentType(user: User): void {
    this.userManagementService.updateEmploymentType(user.UserID, user.EmploymentType).subscribe({
      next: (response) => {
        console.log('Employment type updated successfully', response);
        this.showToastNotification('Employment type updated successfully', 'success');
      },
      error: (error) => {
        console.error('Error updating employment type', error);
        this.showToastNotification('Error updating employment type', 'error');
      },
    });
  }

  saveUserRoles(user: User): void {
    const roleIDs = user.Roles.map(role => role.RoleID);
    this.userManagementService.updateUserRoles(user.UserID, roleIDs).subscribe({
      next: (response) => {
        console.log('Roles updated successfully', response);
        this.showToastNotification('Roles updated successfully', 'success');
      },
      error: (error) => {
        console.error('Error updating roles', error);
        this.showToastNotification('Error updating roles', 'error');
      },
    });
  }

  getAdminRoles(): Role[] {
    return this.availableRoles
      .filter(role => 
        role.RoleName.toLowerCase() === 'superadmin' || role.RoleName.toLowerCase() === 'admin'
      )
      .sort((a, b) => {
        if (a.RoleName.toLowerCase() === 'superadmin') return -1;
        if (b.RoleName.toLowerCase() === 'superadmin') return 1;
        return 0;
      });
  }

  getNonAdminRoles(): Role[] {
    return this.availableRoles.filter(role => 
      role.RoleName.toLowerCase() !== 'admin' && role.RoleName.toLowerCase() !== 'superadmin'
    );
  }

  setUserInactive(userID: number): void {
    // Implement set user inactive functionality here
    // After successfully setting the user to inactive:
    // this.showToastNotification('User set to inactive successfully', 'success');
    // If there's an error:
    // this.showToastNotification('Error setting user to inactive', 'error');
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Hide toast after 3 seconds
  }

  toggleUserActiveStatus(user: User): void {
    console.log('Attempting to toggle status for user:', user);
    this.userManagementService.toggleUserActiveStatus(user.UserID).subscribe({
      next: (response) => {
        console.log('User status updated successfully:', response);
        user.isActive = !user.isActive;
        this.showToastNotification(`User ${user.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.showToastNotification('Error updating user status: ' + error.message, 'error');
      },
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchUsers();
    }
  }

  get totalPagesArray(): number[] {
    const visiblePages = 5;
    if (this.totalPages <= visiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(this.currentPage - Math.floor(visiblePages / 2), 1);
    let end = start + visiblePages - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(end - visiblePages + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value;
    this.searchSubject.next(searchTerm);
  }

  getMaxDisplayedItems(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  toggleAdminRole(user: User, roleID: number): void {
    const superadminRole = this.availableRoles.find(r => r.RoleName.toLowerCase() === 'superadmin');
    const adminRole = this.availableRoles.find(r => r.RoleName.toLowerCase() === 'admin');
    
    if (!superadminRole || !adminRole) return;

    // If selecting superadmin, remove admin role
    if (roleID === superadminRole.RoleID) {
      user.Roles = user.Roles.filter(role => role.RoleID !== adminRole.RoleID);
    }
    // If selecting admin, remove superadmin role
    else if (roleID === adminRole.RoleID) {
      user.Roles = user.Roles.filter(role => role.RoleID !== superadminRole.RoleID);
    }

    // Toggle the selected role
    if (this.isUserRoleSelected(user, roleID)) {
      user.Roles = user.Roles.filter(role => role.RoleID !== roleID);
    } else {
      const roleToAdd = this.availableRoles.find(role => role.RoleID === roleID);
      if (roleToAdd) {
        user.Roles.push(roleToAdd);
      }
    }
    
    this.checkForChanges(user);
  }

  toggleStaffRole(user: User, roleID: number): void {
    const facultyRole = this.availableRoles.find(r => r.RoleName.toLowerCase() === 'faculty');
    const staffRole = this.availableRoles.find(r => r.RoleName.toLowerCase() === 'staff');
    
    if (!facultyRole || !staffRole) return;

    // If selecting faculty, remove staff role
    if (roleID === facultyRole.RoleID) {
      user.Roles = user.Roles.filter(role => role.RoleID !== staffRole.RoleID);
    }
    // If selecting staff, remove faculty role
    else if (roleID === staffRole.RoleID) {
      user.Roles = user.Roles.filter(role => role.RoleID !== facultyRole.RoleID);
    }

    // Toggle the selected role
    if (this.isUserRoleSelected(user, roleID)) {
      user.Roles = user.Roles.filter(role => role.RoleID !== roleID);
    } else {
      const roleToAdd = this.availableRoles.find(role => role.RoleID === roleID);
      if (roleToAdd) {
        user.Roles.push(roleToAdd);
      }
    }
    
    this.checkForChanges(user);
  }
}
