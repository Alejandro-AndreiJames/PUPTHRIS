import { Component, OnInit } from '@angular/core';
import { PdsService } from '../../services/pds.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { User } from '../../model/user.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CampusContextService } from '../../services/campus-context.service';
import { timeout, catchError, retry } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DepartmentService } from '../../services/department.service';

@Component({
  selector: 'app-pds',
  templateUrl: './pds.component.html',
  styleUrls: ['./pds.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PdsComponent implements OnInit {
  userId: number | null = null;
  users: User[] = [];
  paginatedUsers: User[] = [];
  isLoading: boolean = false;
  canManageEmployees: boolean = false;
  campusId: number | null = null;

  // Pagination variables
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  // Toast notification
  showToast: boolean = false;
  errorMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'error';

  pdfUrl: SafeResourceUrl | null = null;
  showPdfViewer: boolean = false;

  currentPdfBlob: Blob | null = null;

  missingDetailsMessage: string | null = null;

  searchTerm: string = '';
  filteredUsers: User[] = [];

  private searchSubject = new Subject<string>();

  selectedRole: string = '';
  selectedEmploymentType: string = '';
  selectedDepartment: string = '';
  departments: any[] = [];

  constructor(
    private pdsService: PdsService, 
    private userService: UserService, 
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private campusContextService: CampusContextService,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    const token = this.authService.getToken();
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.userId = decodedToken.userId;
      this.canManageEmployees = decodedToken.roles.includes('admin') || decodedToken.roles.includes('superadmin');
    }

    this.campusContextService.getCampusId().subscribe(id => {
      if (id !== null) {
        this.campusId = id;
        this.fetchAllUsers();
        this.loadDepartments();
      }
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.searchUsers();
    });
  }

  fetchAllUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    this.userService.getUsers(this.campusId).subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users; // Initialize filteredUsers with all users
        this.totalPages = Math.ceil(this.users.length / this.itemsPerPage);
        this.updatePaginatedUsers();
      },
      error: (error) => {
        console.error('Error fetching users', error);
        this.showToastNotification('Failed to load users. Please try again.', 'error');
      },
    });
  }

  updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  viewPds(): void {
    if (this.userId) {
      this.isLoading = true;
      this.missingDetailsMessage = null;
      this.showPdfViewer = true;
      
      this.pdsService.downloadPDS().subscribe({
        next: (response: Blob | { message: string }) => {
          this.isLoading = false;
          if ('message' in response) {
            this.missingDetailsMessage = response.message;
            this.pdfUrl = null;
            this.currentPdfBlob = null;
            
            this.showToastNotification(response.message, 'warning');
          } else {
            this.currentPdfBlob = response;
            const pdfUrl = URL.createObjectURL(response);
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
            this.missingDetailsMessage = null;
          }
        },
        error: (error) => {
          console.error('Error generating PDS', error);
          this.isLoading = false;
          this.missingDetailsMessage = 'There was a problem generating your PDS. Please ensure all required information is complete and try again.';
          this.pdfUrl = null;
          this.currentPdfBlob = null;
          
          this.showToastNotification(this.missingDetailsMessage, 'error');
        }
      });
    }
  }

  viewUserPds(userId: number): void {
    this.isLoading = true;
    this.missingDetailsMessage = null; // Reset the message
    this.pdsService.downloadPDSForUser(userId).subscribe(
      (response: Blob | { message: string }) => {
        this.isLoading = false;
        if (response instanceof Blob) {
          this.currentPdfBlob = response;
          const pdfUrl = URL.createObjectURL(response);
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
          this.showPdfViewer = true;
        } else {
          this.missingDetailsMessage = response.message;
          this.showPdfViewer = true;
          this.pdfUrl = null;
        }
      },
      (error) => {
        console.error('Error generating PDS for user', error);
        this.isLoading = false;
        this.showToastNotification('Failed to generate PDS. Please try again.', 'error');
      }
    );
  }

  downloadCurrentPdf(): void {
    if (this.currentPdfBlob) {
      const url = window.URL.createObjectURL(this.currentPdfBlob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = 'PDS.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  }

  closePdfViewer(): void {
    this.showPdfViewer = false;
    this.pdfUrl = null;
    this.currentPdfBlob = null;
  }

  getRoleName(roles: any[]): string {
    const relevantRoles = roles.filter(role => 
      role.RoleName.toLowerCase() === 'faculty' || 
      role.RoleName.toLowerCase() === 'staff'
    );
    
    if (relevantRoles.length > 0) {
      return relevantRoles.map(role => 
        role.RoleName.charAt(0).toUpperCase() + role.RoleName.slice(1).toLowerCase()
      ).join(', ');
    }
    return 'N/A';
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.errorMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Hide toast after 3 seconds
  }

  get totalPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  searchUsers(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = this.users;
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.FirstName.toLowerCase().includes(searchTermLower) ||
        user.Surname.toLowerCase().includes(searchTermLower) ||
        user.Fcode.toLowerCase().includes(searchTermLower)
      );
    }
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  onSearch(): void {
    this.applyFilters();
  }

  loadDepartments(): void {
    if (this.campusId === null) {
      console.error('Cannot load departments: Campus ID is null');
      return;
    }
    
    this.departmentService.getDepartments(this.campusId).subscribe({
      next: (departments) => {
        console.log('Departments loaded successfully:', departments);
        this.departments = departments;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  applyFilters(): void {
    console.log('Applying filters:', {
      searchTerm: this.searchTerm,
      selectedRole: this.selectedRole,
      selectedEmploymentType: this.selectedEmploymentType,
      selectedDepartment: this.selectedDepartment
    });

    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm.trim() || 
        `${user.FirstName} ${user.MiddleName} ${user.Surname} ${user.NameExtension}`
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        user.Fcode.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = !this.selectedRole || 
        user.Roles?.some(role => role.RoleName.toLowerCase() === this.selectedRole.toLowerCase());

      const matchesEmploymentType = !this.selectedEmploymentType || 
        user.EmploymentType.toLowerCase() === this.selectedEmploymentType.toLowerCase();

      const matchesDepartment = !this.selectedDepartment || 
        (this.selectedDepartment === 'na' ? !user.Department : 
          user.Department?.DepartmentID?.toString() === this.selectedDepartment);

      return matchesSearch && matchesRole && matchesEmploymentType && matchesDepartment;
    });

    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.updatePaginatedUsers();
  }
}
