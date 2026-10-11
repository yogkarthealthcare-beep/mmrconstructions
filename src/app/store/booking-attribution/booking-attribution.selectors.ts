import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BookingAttributionState } from './booking-attribution.reducer';

export const selectBookingAttributionState =
  createFeatureSelector<BookingAttributionState>('bookingAttribution');

export const selectBookableCustomers = createSelector(
  selectBookingAttributionState,
  (state) => state.customers
);

export const selectCustomersLoading = createSelector(
  selectBookingAttributionState,
  (state) => state.customersLoading
);

export const selectSalesSummary = createSelector(
  selectBookingAttributionState,
  (state) => state.salesSummary
);

export const selectSalesSummaryLoading = createSelector(
  selectBookingAttributionState,
  (state) => state.salesSummaryLoading
);

export const selectApprovals = createSelector(
  selectBookingAttributionState,
  (state) => state.approvals
);

export const selectApprovalsLoading = createSelector(
  selectBookingAttributionState,
  (state) => state.approvalsLoading
);

export const selectPendingApprovalsCount = createSelector(
  selectApprovals,
  (approvals) => approvals.filter(a => a.associate_approval_status === 'Pending').length
);

export const selectSubmittingBooking = createSelector(
  selectBookingAttributionState,
  (state) => state.submittingBooking
);

export const selectLastCreatedBooking = createSelector(
  selectBookingAttributionState,
  (state) => state.lastCreatedBooking
);

export const selectAttributionError = createSelector(
  selectBookingAttributionState,
  (state) => state.error
);
