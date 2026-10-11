import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { BookableCustomer } from '../../services/booking-attribution.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-book-plot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-plot.component.html',
  styleUrls: ['./book-plot.component.css']
})
export class BookPlotComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  buyerType: 'SELF' | 'ON_BEHALF' = 'SELF';

  // Customer search
  customerSearchQuery = '';
  customerSearchResults: BookableCustomer[] = [];
  selectedCustomer: BookableCustomer | null = null;
  searchingCustomers = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Sites & plots
  sites: any[] = [];
  selectedSiteId: number | null = null;
  availablePlots: any[] = [];
  selectedPlotId: number | null = null;
  selectedPlot: any = null;
  plotsLoading = false;

  // Booking fields
  paymentType: 'FullPayment' | 'PartPayment' | 'EMI' = 'PartPayment';
  paymentMethod: string = 'Bank Transfer / NEFT / RTGS';
  allowedPaymentMethods: string[] = [
    'Bank Transfer / NEFT / RTGS',
    'UPI / QR Code',
    'Online Payment Gateway'
  ];
  allowEmiOnBehalf: boolean = false;
  advanceAmount: number = 50000;
  notes: string = '';

  // State
  submitting = false;
  bookingSuccess = false;
  confirmedBooking: any = null;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private attributionApi: BookingAttributionApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();

    // Default buyer type: if customer, must be SELF
    if (!this.isTeamMember && !this.isAssociate) {
      this.buyerType = 'SELF';
    }

    // Load backend capabilities (EMI on-behalf policy & allowed payment methods)
    this.attributionApi.getBookingCapabilities().subscribe({
      next: (caps) => {
        this.allowEmiOnBehalf = caps.allow_emi_on_behalf;
        if (caps.allowed_payment_methods?.length) {
          this.allowedPaymentMethods = caps.allowed_payment_methods;
        }
      },
      error: () => {}
    });

    // Debounced customer search
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.executeCustomerSearch(term);
    });

    // Load available sites
    this.loadSites();

    // Check query params for preselected site or plot
    this.route.queryParams.subscribe(params => {
      if (params['siteId']) {
        this.selectedSiteId = Number(params['siteId']);
        this.onSiteChange(params['plotId'] ? Number(params['plotId']) : null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  get isTeamMember(): boolean {
    return this.auth.isTeamMember();
  }

  get isAssociate(): boolean {
    return this.auth.isAssociate();
  }

  setBuyerType(type: 'SELF' | 'ON_BEHALF'): void {
    this.buyerType = type;
    if (type === 'SELF') {
      this.selectedCustomer = null;
      this.customerSearchQuery = '';
      this.customerSearchResults = [];
    }
  }

  onCustomerSearchInput(): void {
    this.searchSubject.next(this.customerSearchQuery);
  }

  private executeCustomerSearch(term: string): void {
    if (!term || term.trim().length < 2) {
      this.customerSearchResults = [];
      return;
    }
    this.searchingCustomers = true;
    this.attributionApi.getMyBookableCustomers(term.trim()).subscribe({
      next: (results) => {
        this.customerSearchResults = results;
        this.searchingCustomers = false;
      },
      error: () => {
        this.customerSearchResults = [];
        this.searchingCustomers = false;
      }
    });
  }

  selectCustomer(customer: BookableCustomer): void {
    this.selectedCustomer = customer;
    this.customerSearchResults = [];
    this.customerSearchQuery = '';
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.customerSearchResults = [];
  }

  loadSites(): void {
    this.api.getSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || res || [];
      },
      error: (err) => console.error('Failed to load sites:', err)
    });
  }

  onSiteChange(targetPlotId: number | null = null): void {
    if (!this.selectedSiteId) {
      this.availablePlots = [];
      this.selectedPlotId = null;
      this.selectedPlot = null;
      return;
    }

    this.plotsLoading = true;
    this.api.getSitePlots(this.selectedSiteId).subscribe({
      next: (res: any) => {
        const allPlots: any[] = res?.data || res || [];
        // Filter vacant or available plots
        this.availablePlots = allPlots.filter(p =>
          ['Available', 'Vacant'].includes(p.status || p.plot_status)
        );
        this.plotsLoading = false;

        if (targetPlotId) {
          this.selectedPlotId = targetPlotId;
          this.onPlotChange();
        }
      },
      error: (err) => {
        console.error('Failed to load plots:', err);
        this.plotsLoading = false;
      }
    });
  }

  onPlotChange(): void {
    this.selectedPlot = this.availablePlots.find(p => p.plot_id === this.selectedPlotId) || null;
    if (this.selectedPlot) {
      const price = Number(this.selectedPlot.price || this.selectedPlot.base_price || 0);
      if (price > 0 && this.advanceAmount > price) {
        this.advanceAmount = Math.round(price * 0.1);
      }
    }
  }

  getSelectedSiteName(): string {
    const s = this.sites.find(item => item.site_id === this.selectedSiteId);
    return s ? s.site_name : 'Selected Site';
  }

  isSubmitDisabled(): boolean {
    if (!this.selectedPlotId || !this.selectedPlot) return true;
    if (this.buyerType === 'ON_BEHALF' && !this.selectedCustomer) return true;
    if (!this.advanceAmount || this.advanceAmount < 10000) return true;
    if ((this.isTeamMember || this.isAssociate || this.buyerType === 'ON_BEHALF') && this.paymentType === 'EMI' && !this.allowEmiOnBehalf) {
      return true;
    }
    return false;
  }

  submitBooking(): void {
    if (this.isSubmitDisabled()) return;

    this.submitting = true;

    const payload: any = {
      plot_id: this.selectedPlot.plot_id,
      payment_type: this.paymentType,
      payment_method: this.paymentMethod,
      advance_amount: Number(this.advanceAmount),
      buyer_type: this.buyerType,
      notes: this.notes.trim() || undefined
    };

    if (this.buyerType === 'ON_BEHALF' && this.selectedCustomer) {
      payload.customer_id = this.selectedCustomer.user_id;
    }

    // Call API via BookingAttributionApiService
    this.attributionApi.createAttributedBooking(payload, this.isAssociate).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.bookingSuccess = true;
        this.confirmedBooking = res?.data || res?.booking || res || {};
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Booking Submission Failed',
          text: err.message || 'Unable to submit booking. Please check details and try again.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  resetForm(): void {
    this.bookingSuccess = false;
    this.confirmedBooking = null;
    this.selectedPlotId = null;
    this.selectedPlot = null;
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.advanceAmount = 50000;
    this.notes = '';
    if (this.selectedSiteId) {
      this.onSiteChange();
    }
  }

  navigateToMySales(): void {
    if (this.isTeamMember) {
      this.router.navigate(['/team-member/sales']);
    } else if (this.isAssociate) {
      this.router.navigate(['/associate/team-sales']);
    } else {
      this.router.navigate(['/customer/my-plots']);
    }
  }
}
