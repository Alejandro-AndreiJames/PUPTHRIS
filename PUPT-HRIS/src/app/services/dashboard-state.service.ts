import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly STORAGE_KEY = 'dashboardViewState';

  setAdminView(isAdmin: boolean): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(isAdmin));
  }

  getAdminView(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  }
}
