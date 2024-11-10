import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-404',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-404.component.html',
  styleUrl: './page-404.component.css'
})
export class Page404Component {
  constructor(private router: Router) {}

  goBack() {
    window.history.back();
  }

  goHome() {
    this.router.navigate(['/dashboard']);
  }
}
