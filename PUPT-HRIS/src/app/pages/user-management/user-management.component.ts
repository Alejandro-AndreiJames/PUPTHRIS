import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserManagementService } from '../../services/user-management.service';
import { User } from '../../model/user.model';
import { Role } from '../../model/role.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription } from 'rxjs';

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
  itemsPerPage: number = 5;
  totalPages: number = 0;

  visiblePages: number = 5; // Number of page buttons to show

  displayedUsers: User[] = [];

  // Add this property to store original user data
  originalUsers: { [key: number]: User } = {};

  constructor(
    private userManagementService: UserManagementService,
    private campusContextService: CampusContextService
  ) {}

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
  }

  private initializePagination(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.updatePaginatedData();
  }

  fetchUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null, cannot fetch users');
      return;
    }
    console.log('Fetching users for campus ID:', this.campusId);
    this.userManagementService.getAllUsers(this.campusId).subscribe({
      next: (users) => {
        console.log('Received users:', users);
        this.users = users.filter(user => user.CollegeCampusID === this.campusId);
        // Store original state of each user
        this.users.forEach(user => {
          this.originalUsers[user.UserID] = {
            ...user,
            Roles: [...user.Roles]
          };
        });
        this.filteredUsers = this.users;
        this.initializePagination();
      },
      error: (error) => {
        console.error('Error fetching users:', error);
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
    // Force change detection
    this.users = [...this.users];
  }

  saveUserDetails(user: User): void {
    // Create a counter to track completed operations
    let operationsCompleted = 0;
    const totalOperations = 2; // We have 2 operations: employment type and roles

    const updateOriginalUser = () => {
      if (operationsCompleted === totalOperations) {
        // Update the original user data after both operations complete successfully
        this.originalUsers[user.UserID] = {
          ...user,
          Roles: [...user.Roles]
        };
        // Show success toast after both operations complete
        this.showToastNotification('Changes saved successfully', 'success');
      }
    };

    // Save employment type
    this.userManagementService.updateEmploymentType(user.UserID, user.EmploymentType).subscribe({
      next: (response) => {
        console.log('Employment type updated successfully', response);
        operationsCompleted++;
        updateOriginalUser();
      },
      error: (error) => {
        console.error('Error updating employment type', error);
        this.showToastNotification('Error updating employment type', 'error');
      },
    });

    // Save user roles
    const roleIDs = user.Roles.map(role => role.RoleID);
    this.userManagementService.updateUserRoles(user.UserID, roleIDs).subscribe({
      next: (response) => {
        console.log('Roles updated successfully', response);
        operationsCompleted++;
        updateOriginalUser();
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
      this.updatePaginatedData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  get totalPagesArray(): number[] {
    const totalPages = Math.ceil(this.users.length / this.itemsPerPage);
    if (totalPages <= this.visiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(this.currentPage - Math.floor(this.visiblePages / 2), 1);
    let end = start + this.visiblePages - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(end - this.visiblePages + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user => 
        `${user.FirstName} ${user.Surname}`.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.updatePaginatedData();
  }

  hasUserChanges(user: User): boolean {
    const originalUser = this.originalUsers[user.UserID];
    
    if (!originalUser) {
      console.log('No original user found for comparison');
      return false;
    }

    const hasEmploymentTypeChanged = originalUser.EmploymentType !== user.EmploymentType;
    const hasRolesChanged = !this.areRolesEqual(originalUser.Roles, user.Roles);

    console.log('Changes detected:', {
      userId: user.UserID,
      hasEmploymentTypeChanged,
      hasRolesChanged,
      originalEmploymentType: originalUser.EmploymentType,
      currentEmploymentType: user.EmploymentType,
      originalRoles: originalUser.Roles,
      currentRoles: user.Roles
    });

    return hasEmploymentTypeChanged || hasRolesChanged;
  }

  private areRolesEqual(roles1: Role[], roles2: Role[]): boolean {
    if (roles1.length !== roles2.length) return false;
    
    const roleIds1 = roles1.map(r => r.RoleID).sort();
    const roleIds2 = roles2.map(r => r.RoleID).sort();
    
    return roleIds1.every((id, index) => id === roleIds2[index]);
  }
}
