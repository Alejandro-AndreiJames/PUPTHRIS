import { Component } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { LoginComponent } from "./login/login.component";
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { CampusContextService } from './services/campus-context.service';
import { TokenExpirationWarningComponent } from './token-expiration-warning/token-expiration-warning.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, RouterModule, LoginComponent, CommonModule,MainLayoutComponent,TokenExpirationWarningComponent],
  providers: [CampusContextService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private router: Router, private campusContextService: CampusContextService) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
  onCampusChanged(campusId: number): void {
    this.campusContextService.setCampusId(campusId);
  }
}
