import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, BASE_URL } from '../../services/api.service';

@Component({
  selector: 'app-admin-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-payment-management.component.html',
  styleUrls: ['./admin-payment-management.component.css']
})
export class AdminPaymentManagementComponent implements OnInit {
  baseUrl = BASE_URL;
  loading = false;
  activeTab: 'ledger' | 'cash' | 'cheques' | 'disputes' | 'reconciliation' = 'ledger';

  // Alerts & Messages
  toastMsg = '';
  toastType: 'success' | 'danger' = 'success';

  // ── Tab 1: Master Payment Ledger ──
  ledgerList: any[] = [];
  ledgerTotal = 0;
  totalApproved = 0;
  totalPending = 0;
  ledgerPage = 1;
  ledgerLimit = 25;
  ledgerFilters = {
    status: '',
    mode: '',
    purpose: '',
    search: '',
    start_date: '',
    end_date: ''
  };

  // Reject Modal
  rejectModalOpen = false;
  selectedPaymentForReject: any = null;
  rejectionReason = '';
  rejectSubmitting = false;

  // ── Tab 2: Cash Collection Register ──
  cashCollections: any[] = [];
  newCashModalOpen = false;
  newCashSubmitting = false;
  cashForm: any = {
    customer_id: '',
    booking_id: '',
    collector_user_id: '',
    amount: '',
    collection_date: new Date().toISOString().split('T')[0],
    site_location: '',
    remarks: ''
  };

  // ── Tab 3: Cheque Registry ──
  chequeList: any[] = [];
  chequeStatusFilter = '';
  chequeModalOpen = false;
  selectedCheque: any = null;
  chequeStatusUpdateForm: any = {
    status: 'Deposited',
    deposited_date: new Date().toISOString().split('T')[0],
    cleared_date: new Date().toISOString().split('T')[0],
    bounced_date: new Date().toISOString().split('T')[0],
    bounce_reason: '',
    bounce_penalty_amount: 500,
    deposited_bank_account: ''
  };
  chequeSubmitting = false;

  // ── Tab 4: Missing Payment Disputes ──
  disputeList: any[] = [];
  resolveModalOpen = false;
  selectedDispute: any = null;
  disputeResolveForm: any = {
    status: 'ApprovedAndLinked',
    investigation_notes: '',
    create_payment_entry: true
  };
  disputeSubmitting = false;

  // ── Tab 5: Reconciliation Dashboard ──
  reconciliationData: any = null;
  migrationRunning = false;
  migrationResult: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadCurrentTabData();
  }

  setTab(tab: 'ledger' | 'cash' | 'cheques' | 'disputes' | 'reconciliation') {
    this.activeTab = tab;
    this.loadCurrentTabData();
  }

  loadCurrentTabData() {
    if (this.activeTab === 'ledger') this.loadLedger();
    else if (this.activeTab === 'cash') this.loadCashCollections();
    else if (this.activeTab === 'cheques') this.loadCheques();
    else if (this.activeTab === 'disputes') this.loadDisputes();
    else if (this.activeTab === 'reconciliation') this.loadReconciliation();
  }

  // ── Ledger Operations ──
  loadLedger() {
    this.loading = true;
    const params: any = {
      page: this.ledgerPage,
      limit: this.ledgerLimit,
      ...this.ledgerFilters
    };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);

    this.api.adminGetPaymentLedger(params).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.ledgerList = res.data || [];
          this.ledgerTotal = res.total || 0;
          this.totalApproved = res.total_approved || 0;
          this.totalPending = res.total_pending || 0;
        }
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load payment ledger', 'danger');
      }
    });
  }

  approvePayment(item: any) {
    if (!confirm(`Are you sure you want to approve payment ${item.payment_serial} of ₹${item.gross_amount}? This will allocate funds, issue receipts, and trigger associate commissions.`)) {
      return;
    }

    this.api.adminApprovePayment(item.payment_id).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Payment approved and allocated successfully!', 'success');
        this.loadLedger();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to approve payment', 'danger');
      }
    });
  }

  openRejectModal(item: any) {
    this.selectedPaymentForReject = item;
    this.rejectionReason = '';
    this.rejectModalOpen = true;
  }

  closeRejectModal() {
    this.rejectModalOpen = false;
    this.selectedPaymentForReject = null;
  }

  submitPaymentRejection() {
    if (!this.selectedPaymentForReject) return;
    if (!this.rejectionReason.trim()) {
      alert('Rejection reason is mandatory.');
      return;
    }

    this.rejectSubmitting = true;
    this.api.adminRejectPayment(this.selectedPaymentForReject.payment_id, this.rejectionReason.trim()).subscribe({
      next: (res: any) => {
        this.rejectSubmitting = false;
        this.closeRejectModal();
        this.showToast(res.message || 'Payment rejected successfully', 'success');
        this.loadLedger();
      },
      error: (err) => {
        this.rejectSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to reject payment', 'danger');
      }
    });
  }

  // ── Cash Collection Operations ──
  loadCashCollections() {
    this.loading = true;
    this.api.adminGetCashCollections().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.cashCollections = res.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load cash collections', 'danger');
      }
    });
  }

  openNewCashModal() {
    this.cashForm = {
      customer_id: '',
      booking_id: '',
      collector_user_id: '',
      amount: '',
      collection_date: new Date().toISOString().split('T')[0],
      site_location: '',
      remarks: ''
    };
    this.newCashModalOpen = true;
  }

  closeNewCashModal() {
    this.newCashModalOpen = false;
  }

  submitNewCashCollection() {
    if (!this.cashForm.customer_id || !this.cashForm.booking_id || !this.cashForm.amount) {
      alert('Customer ID, Booking ID, and Amount are required.');
      return;
    }

    this.newCashSubmitting = true;
    this.api.adminCreateCashCollection(this.cashForm).subscribe({
      next: (res: any) => {
        this.newCashSubmitting = false;
        this.closeNewCashModal();
        this.showToast(res.message || 'Cash collection recorded successfully in the register', 'success');
        this.loadCashCollections();
      },
      error: (err) => {
        this.newCashSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to record cash collection', 'danger');
      }
    });
  }

  // ── Cheque Registry Operations ──
  loadCheques() {
    this.loading = true;
    const params: any = {};
    if (this.chequeStatusFilter) params.status = this.chequeStatusFilter;

    this.api.adminGetCheques(params).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.chequeList = res.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load cheque registry', 'danger');
      }
    });
  }

  openChequeModal(cheque: any) {
    this.selectedCheque = cheque;
    this.chequeStatusUpdateForm = {
      status: cheque.cheque_status === 'ChequeReceived' ? 'Deposited' : (cheque.cheque_status === 'Deposited' ? 'Cleared' : cheque.cheque_status),
      deposited_date: cheque.deposited_date || new Date().toISOString().split('T')[0],
      cleared_date: cheque.cleared_date || new Date().toISOString().split('T')[0],
      bounced_date: cheque.bounced_date || new Date().toISOString().split('T')[0],
      bounce_reason: cheque.bounce_reason || '',
      bounce_penalty_amount: cheque.bounce_penalty_amount || 500,
      deposited_bank_account: cheque.deposited_bank_account || ''
    };
    this.chequeModalOpen = true;
  }

  closeChequeModal() {
    this.chequeModalOpen = false;
    this.selectedCheque = null;
  }

  submitChequeStatusUpdate() {
    if (!this.selectedCheque) return;

    this.chequeSubmitting = true;
    this.api.adminUpdateChequeStatus(this.selectedCheque.cheque_id, this.chequeStatusUpdateForm).subscribe({
      next: (res: any) => {
        this.chequeSubmitting = false;
        this.closeChequeModal();
        this.showToast(res.message || 'Cheque status updated successfully', 'success');
        this.loadCheques();
      },
      error: (err) => {
        this.chequeSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to update cheque status', 'danger');
      }
    });
  }

  // ── Dispute Resolution Operations ──
  loadDisputes() {
    this.loading = true;
    this.api.adminGetMissingPayments().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.disputeList = res.data || [];
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load dispute complaints', 'danger');
      }
    });
  }

  openResolveModal(dispute: any) {
    this.selectedDispute = dispute;
    this.disputeResolveForm = {
      status: 'ApprovedAndLinked',
      investigation_notes: '',
      create_payment_entry: true
    };
    this.resolveModalOpen = true;
  }

  closeResolveModal() {
    this.resolveModalOpen = false;
    this.selectedDispute = null;
  }

  submitDisputeResolution() {
    if (!this.selectedDispute) return;

    this.disputeSubmitting = true;
    this.api.adminResolveMissingPayment(this.selectedDispute.complaint_id, this.disputeResolveForm).subscribe({
      next: (res: any) => {
        this.disputeSubmitting = false;
        this.closeResolveModal();
        this.showToast(res.message || 'Dispute resolved successfully', 'success');
        this.loadDisputes();
      },
      error: (err) => {
        this.disputeSubmitting = false;
        this.showToast(err?.error?.message || 'Failed to resolve dispute', 'danger');
      }
    });
  }

  // ── Reconciliation Operations ──
  loadReconciliation() {
    this.loading = true;
    this.api.adminGetReconciliationDashboard().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.reconciliationData = res.data;
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load reconciliation dashboard', 'danger');
      }
    });
  }

  runMigration() {
    if (!confirm('Run historical payment ledger migration? This will safely backfill all legacy paid EMIs and advances without double-counting.')) {
      return;
    }

    this.migrationRunning = true;
    this.migrationResult = null;
    this.api.adminRunPaymentMigration().subscribe({
      next: (res: any) => {
        this.migrationRunning = false;
        this.migrationResult = res.data || res;
        this.showToast(res.message || 'Migration completed successfully', 'success');
        this.loadReconciliation();
      },
      error: (err) => {
        this.migrationRunning = false;
        this.showToast(err?.error?.message || 'Failed to run migration', 'danger');
      }
    });
  }

  // ── Helpers ──
  downloadReceipt(receiptId: number | string) {
    window.open(`${this.baseUrl}/api/receipts/${receiptId}/pdf`, '_blank');
  }

  downloadVoucher(emiId: number | string) {
    window.open(`${this.baseUrl}/api/emi/${emiId}/voucher`, '_blank');
  }

  showToast(msg: string, type: 'success' | 'danger') {
    this.toastMsg = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = '', 4500);
  }
}
