import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../model/department.model';
import { Role } from '../../model/role.model'; // Import the Role model
import { CommonModule } from '@angular/common';
import { RoleService } from '../../services/role.service';
import { trigger, transition, style, animate } from '@angular/animations'; // Import Angular animations
import { CollegeCampusService } from '../../services/college-campus.service';
import { CollegeCampus } from '../../model/college-campus.model';
import { AuthService } from '../../services/auth.service';
import { CampusContextService } from '../../services/campus-context.service'; // Add this import

@Component({
  selector: 'app-new-account',
  templateUrl: './new-account.component.html',
  styleUrls: ['./new-account.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  animations: [ // Add animations for toast
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
})
export class NewAccountComponent implements OnInit {
  newAccountForm: FormGroup;
  toastVisible: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  departments: Department[] = []; // Array to store departments
  roles: Role[] = []; // Use the Role model here
  collegeCampuses: CollegeCampus[] = [];
  showCollegeCampus: boolean = false;
  adminRoleId: string = ''; // We'll set this in ngOnInit
  currentUserCollegeCampusID: number | null = null;
  isLoading: boolean = false;
  showSuccess: boolean = false;
  isCurrentUserAdmin: boolean = false;
  decodedToken: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private departmentService: DepartmentService,
    private roleService: RoleService,
    private collegeCampusService: CollegeCampusService,
    private authService: AuthService,
    private campusContextService: CampusContextService
  ) {
    this.newAccountForm = this.fb.group({
      Fcode: ['', Validators.required],
      Surname: ['', Validators.required],
      FirstName: ['', Validators.required],
      MiddleName: [''],
      NameExtension: [''],
      Email: ['', [Validators.required, Validators.email]],
      EmploymentType: ['', Validators.required],
      Password: ['', [Validators.required, Validators.minLength(6)]],
      Roles: [[], Validators.required], // Multi-select for roles
      DepartmentID: [{ value: '', disabled: true }],
      CollegeCampusID: [{ value: '', disabled: true }],
    });
  }

  ngOnInit(): void {
    this.decodedToken = this.authService.getDecodedToken();
    if (this.decodedToken && this.decodedToken.roles) {
      this.isCurrentUserAdmin = this.decodedToken.roles.includes('admin');
    }
    
    this.loadRoles();
    this.loadCollegeCampuses();
  
    this.newAccountForm.get('Roles')?.valueChanges.subscribe((selectedRoles: string[]) => {
      this.handleRoleSelection(selectedRoles);
    });
  
    // Initial load of current user's college campus
    this.getCurrentUserCollegeCampus();
  
    // Subscribe to future campus changes
    this.campusContextService.getCampusId().subscribe(campusId => {
      if (campusId !== null && campusId !== this.currentUserCollegeCampusID) {
        this.currentUserCollegeCampusID = campusId;
        this.loadDepartments();
      }
    });

    // Add this new subscription
    this.newAccountForm.get('CollegeCampusID')?.valueChanges.subscribe((campusId) => {
      if (campusId) {
        this.loadDepartmentsForCampus(campusId);
      }
    });
  }

  loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: roles => {
        this.roles = roles;
        // Find the admin role and store its ID
        const adminRole = roles.find(role => role.RoleName.toLowerCase() === 'admin');
        if (adminRole) {
          this.adminRoleId = adminRole.RoleID.toString();
        }
      },
      error: error => console.error('Error fetching roles', error)
    });
  }

  loadDepartments(): void {
    if (this.currentUserCollegeCampusID) {
      this.departmentService.getDepartments(this.currentUserCollegeCampusID).subscribe({
        next: departments => {
          this.departments = departments;
          this.newAccountForm.get('DepartmentID')?.setValue('');
          if (departments.length === 0) {
          }
        },
        error: error => {
          console.error('Error fetching departments', error);
          // Remove the toast notification from here as well
        }
      });
    } else {
      this.departments = [];
    }
  }

  loadCollegeCampuses(): void {
    this.collegeCampusService.getCollegeCampuses().subscribe({
      next: campuses => this.collegeCampuses = campuses,
      error: error => console.error('Error fetching college campuses', error)
    });
  }

  // Handle role selection logic
  handleRoleSelection(selectedRoles: string[]): void {
    const departmentControl = this.newAccountForm.get('DepartmentID');
    const collegeCampusControl = this.newAccountForm.get('CollegeCampusID');

    // Get the actual role IDs from the roles array
    const facultyRole = this.roles.find(r => r.RoleName.toLowerCase() === 'faculty');
    const adminRole = this.roles.find(r => r.RoleName.toLowerCase() === 'admin');
    const staffRole = this.roles.find(r => r.RoleName.toLowerCase() === 'staff');

    const isFacultySelected = selectedRoles.includes(facultyRole?.RoleID?.toString() || '');
    const isAdminSelected = selectedRoles.includes(adminRole?.RoleID?.toString() || '');
    const isStaffSelected = selectedRoles.includes(staffRole?.RoleID?.toString() || '');

    // If faculty is selected, remove staff role and vice versa
    if (isFacultySelected && isStaffSelected) {
      const staffIndex = selectedRoles.indexOf(staffRole?.RoleID?.toString() || '');
      if (staffIndex > -1) {
        selectedRoles.splice(staffIndex, 1);
        this.newAccountForm.get('Roles')?.setValue(selectedRoles);
      }
    }

    // Handle department control based on role selection
    if (isFacultySelected) {
      departmentControl?.enable();
      departmentControl?.setValidators([Validators.required]);
    } else if (isStaffSelected) {
      departmentControl?.disable();
      departmentControl?.clearValidators();
      departmentControl?.setValue('');
    } else {
      departmentControl?.enable();
      departmentControl?.setValidators([Validators.required]);
    }

    // Handle college campus control for admin role
    if (isAdminSelected) {
      this.showCollegeCampus = true;
      collegeCampusControl?.enable();
      collegeCampusControl?.setValidators([Validators.required]);
      departmentControl?.enable();
    } else {
      this.showCollegeCampus = false;
      collegeCampusControl?.disable();
      collegeCampusControl?.clearValidators();
      collegeCampusControl?.setValue('');
      
      // Reset department selection when admin is deselected
      if (!isFacultySelected) {
        departmentControl?.setValue('');
        this.departments = [];
        this.loadDepartments();
      }
    }

    collegeCampusControl?.updateValueAndValidity();
    departmentControl?.updateValueAndValidity();
  }

  // Update selected roles when checkbox changes
  onRoleCheckboxChange(event: any): void {
    const selectedRoles = this.newAccountForm.get('Roles')?.value || [];
    const roleId = event.target.value;

    if (event.target.checked) {
      selectedRoles.push(roleId);
    } else {
      const index = selectedRoles.indexOf(roleId);
      if (index > -1) {
        selectedRoles.splice(index, 1);
      }
    }
    this.newAccountForm.get('Roles')?.setValue(selectedRoles);
    this.handleRoleSelection(selectedRoles);
  }

  generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  onGeneratePasswordClick(): void {
    const generatedPassword = this.generatePassword();
    this.newAccountForm.get('Password')?.setValue(generatedPassword);
  }

  showToast(type: 'success' | 'error', message: string): void {
    // Reset first
    this.toastVisible = false;
    this.toastMessage = '';
    
    // Small delay before showing new toast
    setTimeout(() => {
      this.toastType = type;
      this.toastMessage = message;
      this.toastVisible = true;

      // Hide toast after 3 seconds
      setTimeout(() => {
        this.toastVisible = false;
        this.toastMessage = '';  // Clear the message when hiding
      }, 3000);
    }, 100);
  }

  onSubmit(): void {
    if (this.newAccountForm.valid) {
      this.isLoading = true;
      const formData = this.newAccountForm.value;

      // Convert role IDs to numbers if needed
      formData.Roles = formData.Roles.map((roleId: string) => parseInt(roleId, 10));

      // Handle DepartmentID
      if (formData.Roles.includes(this.roles.find(r => r.RoleName.toLowerCase() === 'staff')?.RoleID)) {
        formData.DepartmentID = null;
      }

      // Handle CollegeCampusID
      if (!formData.Roles.includes(this.adminRoleId)) {
        formData.CollegeCampusID = this.currentUserCollegeCampusID;
      }

      this.userService.addUser(formData).subscribe({
        next: response => {
          this.isLoading = false;
          this.showSuccess = true; // Show success state
          
          // Hide success message and reset form after 2 seconds
          setTimeout(() => {
            this.showSuccess = false;
            this.resetForm();
            this.showToast('success', 'Account created successfully');
          }, 2000);
        },
        error: error => {
          console.error("Backend error details:", error);
          this.isLoading = false;
          this.showToast('error', 'Error creating account');
        }
      });
    }
  }

  // Add this new method to reset the form
  resetForm(): void {
    this.newAccountForm.reset();
    this.newAccountForm.patchValue({
      EmploymentType: '',
      Roles: [],
      DepartmentID: { value: '', disabled: true },
      CollegeCampusID: { value: '', disabled: true }
    });
    this.showCollegeCampus = false;
    this.departments = [];
    this.loadDepartments();
  
    // Reset the checked state of role checkboxes
    this.roles.forEach(role => {
      const checkbox = document.querySelector(`input[type="checkbox"][value="${role.RoleID}"]`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    // Re-initialize form state based on roles
    this.handleRoleSelection([]);
  }

  getCurrentUserCollegeCampus(): void {
    this.campusContextService.getCampusId().subscribe(campusId => {
      if (campusId !== null) {
        this.currentUserCollegeCampusID = campusId;
        this.loadDepartments();
      } else {
        const decodedToken = this.authService.getDecodedToken();
        if (decodedToken && decodedToken.userId) {
          this.userService.getUserById(decodedToken.userId).subscribe({
            next: (user) => {
              this.currentUserCollegeCampusID = user.CollegeCampusID;
              this.campusContextService.updateCampus(this.currentUserCollegeCampusID);
              this.loadDepartments();
            },
            error: (error) => {
              console.error('Error fetching current user details:', error);
            }
          });
        } else {
          console.error('No user ID found in token');
        }
      }
    });
  }

  loadDepartmentsForCampus(campusId: number): void {
    this.departmentService.getDepartments(campusId).subscribe({
      next: departments => {
        this.departments = departments;
        this.newAccountForm.get('DepartmentID')?.setValue('');
        if (departments.length === 0) {
        }
      },
      error: error => {
        console.error('Error fetching departments', error);
      }
    });
  }

  isRoleSelected(roleId: number): boolean {
    const selectedRoles = this.newAccountForm.get('Roles')?.value || [];
    return selectedRoles.includes(roleId.toString());
  }
}
