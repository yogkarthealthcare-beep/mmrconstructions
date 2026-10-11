import { createAction, props } from '@ngrx/store';
import {
  BookableCustomer,
  SalesTrackerSummary,
  BookingAttribution,
  ApprovalDecisionPayload
} from '../../services/booking-attribution.types';

// Bookable Customers
export const loadBookableCustomers = createAction(
  '[Booking Attribution] Load Bookable Customers',
  props<{ search?: string }>()
);

export const loadBookableCustomersSuccess = createAction(
  '[Booking Attribution] Load Bookable Customers Success',
  props<{ customers: BookableCustomer[] }>()
);

export const loadBookableCustomersFailure = createAction(
  '[Booking Attribution] Load Bookable Customers Failure',
  props<{ error: string }>()
);

// Submit Booking
export const submitAttributedBooking = createAction(
  '[Booking Attribution] Submit Booking',
  props<{ payload: any; isAssociate?: boolean }>()
);

export const submitAttributedBookingSuccess = createAction(
  '[Booking Attribution] Submit Booking Success',
  props<{ booking: any }>()
);

export const submitAttributedBookingFailure = createAction(
  '[Booking Attribution] Submit Booking Failure',
  props<{ error: string }>()
);

// Sales Summary
export const loadSalesSummary = createAction(
  '[Booking Attribution] Load Sales Summary',
  props<{ teamMemberId: number }>()
);

export const loadSalesSummarySuccess = createAction(
  '[Booking Attribution] Load Sales Summary Success',
  props<{ summary: SalesTrackerSummary }>()
);

export const loadSalesSummaryFailure = createAction(
  '[Booking Attribution] Load Sales Summary Failure',
  props<{ error: string }>()
);

// Approvals
export const loadApprovals = createAction(
  '[Booking Attribution] Load Approvals',
  props<{ status?: string; overdueOnly?: boolean }>()
);

export const loadApprovalsSuccess = createAction(
  '[Booking Attribution] Load Approvals Success',
  props<{ approvals: BookingAttribution[] }>()
);

export const loadApprovalsFailure = createAction(
  '[Booking Attribution] Load Approvals Failure',
  props<{ error: string }>()
);

// Decide Approval
export const decideApproval = createAction(
  '[Booking Attribution] Decide Approval',
  props<{ bookingId: number; payload: ApprovalDecisionPayload }>()
);

export const decideApprovalSuccess = createAction(
  '[Booking Attribution] Decide Approval Success',
  props<{ bookingId: number; decision: string }>()
);

export const decideApprovalFailure = createAction(
  '[Booking Attribution] Decide Approval Failure',
  props<{ error: string }>()
);

export const resetAttributionState = createAction(
  '[Booking Attribution] Reset State'
);
