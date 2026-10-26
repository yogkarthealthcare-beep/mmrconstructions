import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CustomerLookupItem } from '../receipt.types';

@Component({
  selector: 'app-receipt-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receipt-form.component.html',
  styleUrls: ['./receipt-form.component.css']
})
export class ReceiptFormComponent implements OnInit {
  loading = false;
  submitting = false;
  showPreview = false;
  toastMessage = '';
  toastType: 'success' | 'danger' = 'success';

  // Customer search autocomplete
  customerSearchQuery = '';
  customerSearchResults: CustomerLookupItem[] = [];
  searchingCustomers = false;
  showCustomerDropdown = false;

  // Form Model
  form: any = {
    receipt_no: '',
    serial_no: 1,
    receipt_date: new Date().toISOString().split('T')[0],
    plot_no: '',
    plot_area: '',
    plot_id: null,
    site_id: null,
    customer_id: null,
    customer_name: '',
    mobile_no: '',
    r_o_p: '',
    payment_type: 'Cash',
    payment_mode: 'Full Payment',
    cheque_no: '',
    cheque_date: '',
    bank_name: '',
    receipt_amount: 0,
    paid_amount: 0,
    inward_amount: 0,
    amount_depositor_name: '',
    advisor_name: '',
    advisor_mobile: '',
    full_payment_time: '',
    plotting_place: '00, TRIBHUVAN KHEDA, SHESHPUR, Unnao, Uttar Pradesh - 209801, India',
    depositor_signature: '',
    authorized_signature: '',
    notes: '',
  };

  selectedCustomerSponsor: any = null;

  // Site & Plot Selection Modal (Phase 4)
  showPlotModal = false;
  loadingSites = false;
  sites: any[] = [];
  selectedSite: any = null;
  loadingPlots = false;
  plots: any[] = [];
  selectedPlot: any = null;
  plotStatusFilter = 'ALL';

  settings: any = {
    company_name: 'MMR Construction & Developers',
    company_logo: '',
    address: 'Tribhuvan Kheda, Sheshpur, Unnao, Uttar Pradesh, India, 209801',
    cin: 'U68200UP2025PTC229203',
    gst_number: '09AATCM6753A1Z5',
    phone: '+91 95111 19879',
    email: 'official@mmrconstructions.in',
    signature_url: ''
  };

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNextReceiptNumber();
    this.api.get('/api/admin/invoice-settings', {}, true).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.company_name) {
          this.settings = { ...this.settings, ...res.data };
        }
      },
      error: () => {}
    });
  }

  loadNextReceiptNumber(): void {
    this.loading = true;
    this.api.adminGetNextReceiptNo().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.form.receipt_no = res.data.receipt_no;
          this.form.serial_no = res.data.serial_no;
          this.form.receipt_date = res.data.receipt_date || this.form.receipt_date;
          this.form.plotting_place = res.data.plotting_place || this.form.plotting_place;
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error fetching next receipt number:', err);
      }
    });
  }

  onCustomerSearch(): void {
    const q = this.customerSearchQuery.trim();
    if (q.length < 2) {
      this.customerSearchResults = [];
      this.showCustomerDropdown = false;
      return;
    }

    this.searchingCustomers = true;
    this.api.adminCustomerLookup(q).subscribe({
      next: (res: any) => {
        this.searchingCustomers = false;
        this.customerSearchResults = res.data || [];
        this.showCustomerDropdown = this.customerSearchResults.length > 0;
      },
      error: (err: any) => {
        this.searchingCustomers = false;
        console.error('Customer lookup error:', err);
      }
    });
  }

  selectCustomer(cust: CustomerLookupItem): void {
    this.form.customer_id = cust.user_id;
    this.form.customer_name = cust.full_name;
    this.form.mobile_no = cust.mobile_no;
    this.customerSearchQuery = `${cust.full_name} (${cust.mobile_no})`;
    this.showCustomerDropdown = false;

    // Phase 2: Retrieve verified sponsor/referral from DB
    if (cust.sponsor_name || cust.sponsor_id) {
      this.selectedCustomerSponsor = {
        name: cust.sponsor_name,
        member_id: cust.sponsor_member_id,
        mobile: cust.sponsor_mobile,
        role: cust.sponsor_role || 'Associate',
        id: cust.sponsor_id
      };
      this.form.advisor_name = cust.sponsor_name;
      this.form.advisor_mobile = cust.sponsor_mobile || '';
    } else {
      this.selectedCustomerSponsor = {
        isDirect: true,
        label: 'Individual Customer (Company Direct — No Referral Commission)'
      };
      this.form.advisor_name = '';
      this.form.advisor_mobile = '';
    }
  }

  clearCustomerSelection(): void {
    this.form.customer_id = null;
    this.customerSearchQuery = '';
    this.showCustomerDropdown = false;
    this.selectedCustomerSponsor = null;
  }

  // ── Site & Plot Picker Modal ──
  openPlotPickerModal(): void {
    this.showPlotModal = true;
    if (this.sites.length === 0) {
      this.loadSites();
    }
  }

  closePlotPickerModal(): void {
    this.showPlotModal = false;
  }

  loadSites(): void {
    this.loadingSites = true;
    this.api.getSites().subscribe({
      next: (res: any) => {
        this.loadingSites = false;
        this.sites = res.data || (Array.isArray(res) ? res : []);
      },
      error: () => {
        this.loadingSites = false;
        this.showToast('Failed to load property sites', 'danger');
      }
    });
  }

  onSelectSite(site: any): void {
    this.selectedSite = site;
    this.loadingPlots = true;
    this.plots = [];
    const siteId = site.site_id || site.id;
    this.api.getSitePlots(siteId).subscribe({
      next: (res: any) => {
        this.loadingPlots = false;
        this.plots = res.data || (Array.isArray(res) ? res : []);
      },
      error: () => {
        this.loadingPlots = false;
        this.showToast('Failed to load plots for selected site', 'danger');
      }
    });
  }

  backToSitesList(): void {
    this.selectedSite = null;
    this.plots = [];
  }

  get filteredPlots(): any[] {
    if (this.plotStatusFilter === 'ALL') return this.plots;
    return this.plots.filter((p: any) => String(p.plot_status || 'Vacant').toLowerCase() === this.plotStatusFilter.toLowerCase());
  }

  onSelectPlot(plot: any): void {
    const status = String(plot.plot_status || 'Vacant').toLowerCase();
    if (!['vacant', 'available'].includes(status)) {
      this.showToast(`Plot #${plot.plot_number} is ${plot.plot_status}. Only vacant plots can be selected.`, 'danger');
      return;
    }

    this.selectedPlot = plot;
    this.form.plot_id = plot.plot_id;
    this.form.site_id = this.selectedSite?.site_id || this.selectedSite?.id || plot.site_id;
    this.form.plot_no = plot.plot_number;
    this.form.plot_area = plot.plot_area ? `${plot.plot_area} Gaj` : '';

    const siteName = this.selectedSite?.site_name || 'MMR City';
    const siteAddr = this.selectedSite?.full_address || this.selectedSite?.city || 'Unnao, UP';
    this.form.plotting_place = `${siteName}, ${siteAddr}`;

    if (plot.base_price && (!this.form.receipt_amount || this.form.receipt_amount === 0)) {
      this.form.receipt_amount = Number(plot.base_price);
    }

    this.showToast(`Selected Plot #${plot.plot_number} (${siteName})`, 'success');
    this.closePlotPickerModal();
  }

  getBalance(): number {
    const tot = Number(this.form.receipt_amount || this.form.paid_amount || 0);
    const paid = Number(this.form.paid_amount || 0);
    return Math.max(0, tot - paid);
  }

  getQrUrl(): string {
    const recNo = encodeURIComponent(this.form.receipt_no || 'MMR-REC-PREVIEW');
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://mmrconstructions.in/admin/receipts?verify=${recNo}`;
  }

  onPaidAmountChange(): void {
    if (!this.form.receipt_amount || this.form.receipt_amount === 0) {
      this.form.receipt_amount = this.form.paid_amount;
    }
  }

  openPreview(): void {
    // Validation
    if (!this.form.customer_name || !this.form.customer_name.trim()) {
      this.showToast('Please enter Customer Name', 'danger');
      return;
    }
    if (!this.form.mobile_no || !this.form.mobile_no.trim()) {
      this.showToast('Please enter Mobile Number', 'danger');
      return;
    }
    if (this.form.paid_amount == null || isNaN(this.form.paid_amount) || Number(this.form.paid_amount) < 0) {
      this.showToast('Please enter a valid Paid Amount', 'danger');
      return;
    }
    if (this.form.payment_type === 'Cheque') {
      if (!this.form.cheque_no || !this.form.cheque_no.trim()) {
        this.showToast('Cheque Number is required for Cheque payment', 'danger');
        return;
      }
      if (!this.form.bank_name || !this.form.bank_name.trim()) {
        this.showToast('Bank Name is required for Cheque payment', 'danger');
        return;
      }
    }

    this.showPreview = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closePreview(): void {
    this.showPreview = false;
  }

  confirmAndSave(): void {
    this.submitting = true;
    this.api.adminCreateReceipt(this.form).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res.success) {
          this.showPreview = false;
          this.showToast(res.message || 'Receipt saved permanently!', 'success');
          setTimeout(() => {
            this.router.navigate(['/admin/receipts']);
          }, 1200);
        } else {
          this.showToast(res.message || 'Failed to create receipt', 'danger');
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.showToast(err?.error?.message || 'Error creating receipt. Please verify details.', 'danger');
      }
    });
  }

  getAmountInWords(amount: number): string {
    const n = Math.floor(Number(amount) || 0);
    if (n === 0) return 'Zero Rupees Only';

    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertTwoDigits = (v: number) => {
      if (v < 20) return a[v];
      return b[Math.floor(v / 10)] + (v % 10 !== 0 ? ' ' + a[v % 10] : '');
    };

    const convertThreeDigits = (v: number) => {
      let str = '';
      if (v >= 100) {
        str += a[Math.floor(v / 100)] + ' Hundred ';
        v %= 100;
      }
      if (v > 0) {
        str += convertTwoDigits(v);
      }
      return str.trim();
    };

    let words = '';
    const crore = Math.floor(n / 10000000);
    let rem = n % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    const hundred = rem;

    if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
    if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
    if (hundred > 0) words += convertThreeDigits(hundred) + ' ';

    return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
  }

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4500);
  }
}
