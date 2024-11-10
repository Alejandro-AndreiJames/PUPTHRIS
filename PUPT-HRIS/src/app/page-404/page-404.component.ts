import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-page-404',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-404.component.html',
  styleUrl: './page-404.component.css'
})
export class Page404Component implements OnInit {
  constructor(
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    const previousUrl = sessionStorage.getItem('lastValidUrl');
    if (!previousUrl) {
      sessionStorage.setItem('lastValidUrl', '/dashboard');
    }
  }

  goBack(): void {
    const previousUrl = sessionStorage.getItem('lastValidUrl') || '/dashboard';
    this.router.navigate([previousUrl]);
  }
}
