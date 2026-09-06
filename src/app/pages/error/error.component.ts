import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterLink, TopbarComponent, NavbarComponent, FooterComponent],
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit, OnDestroy {
  errorMessage = 'An unexpected error occurred while processing your request.';
  errorCode = '500';
  countdown = 5;
  private intervalId: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit(): void {
    const msg = this.route.snapshot.queryParamMap.get('message');
    const code = this.route.snapshot.queryParamMap.get('code');
    if (msg) this.errorMessage = msg;
    if (code) this.errorCode = code;

    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.intervalId = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearCountdown();
        this.goHome();
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  goBack(): void {
    this.clearCountdown();
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      this.location.back();
    } else {
      this.goHome();
    }
  }

  retry(): void {
    this.clearCountdown();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  goHome(): void {
    this.clearCountdown();
    this.router.navigate(['/']);
  }
}
