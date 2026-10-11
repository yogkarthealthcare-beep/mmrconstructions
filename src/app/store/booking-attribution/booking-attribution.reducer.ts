import { createReducer, on } from '@ngrx/store';
import * as Actions from './booking-attribution.actions';
import {
  BookableCustomer,
  SalesTrackerSummary,
  BookingAttribution,
  AssociateApprovalStatus
} from '../../services/booking-attribution.types';

export interface BookingAttributionState {
  customers: BookableCustomer[];
  customersLoading: boolean;
  salesSummary: SalesTrackerSummary | null;
  salesSummaryLoading: boolean;
  approvals: BookingAttribution[];
  approvalsLoading: boolean;
  submittingBooking: boolean;
  lastCreatedBooking: any | null;
  decidingApproval: boolean;
  error: string | null;
}

export const initialState: BookingAttributionState = {
  customers: [],
  customersLoading: false,
  salesSummary: null,
  salesSummaryLoading: false,
  approvals: [],
  approvalsLoading: false,
  submittingBooking: false,
  lastCreatedBooking: null,
  decidingApproval: false,
  error: null
};

export const bookingAttributionReducer = createReducer(
  initialState,
  on(Actions.loadBookableCustomers, (state) => ({
    ...state,
    customersLoading: true,
    error: null
  })),
  on(Actions.loadBookableCustomersSuccess, (state, { customers }) => ({
    ...state,
    customersLoading: false,
    customers,
    error: null
  })),
  on(Actions.loadBookableCustomersFailure, (state, { error }) => ({
    ...state,
    customersLoading: false,
    error
  })),

  on(Actions.submitAttributedBooking, (state) => ({
    ...state,
    submittingBooking: true,
    lastCreatedBooking: null,
    error: null
  })),
  on(Actions.submitAttributedBookingSuccess, (state, { booking }) => ({
    ...state,
    submittingBooking: false,
    lastCreatedBooking: booking,
    error: null
  })),
  on(Actions.submitAttributedBookingFailure, (state, { error }) => ({
    ...state,
    submittingBooking: false,
    error
  })),

  on(Actions.loadSalesSummary, (state) => ({
    ...state,
    salesSummaryLoading: true,
    error: null
  })),
  on(Actions.loadSalesSummarySuccess, (state, { summary }) => ({
    ...state,
    salesSummaryLoading: false,
    salesSummary: summary,
    error: null
  })),
  on(Actions.loadSalesSummaryFailure, (state, { error }) => ({
    ...state,
    salesSummaryLoading: false,
    error
  })),

  on(Actions.loadApprovals, (state) => ({
    ...state,
    approvalsLoading: true,
    error: null
  })),
  on(Actions.loadApprovalsSuccess, (state, { approvals }) => ({
    ...state,
    approvalsLoading: false,
    approvals,
    error: null
  })),
  on(Actions.loadApprovalsFailure, (state, { error }) => ({
    ...state,
    approvalsLoading: false,
    error
  })),

  on(Actions.decideApproval, (state) => ({
    ...state,
    decidingApproval: true,
    error: null
  })),
  on(Actions.decideApprovalSuccess, (state, { bookingId, decision }) => ({
    ...state,
    decidingApproval: false,
    approvals: state.approvals.map(a =>
      a.booking_id === bookingId
        ? { ...a, associate_approval_status: (decision === 'approve' ? 'Approved' : 'Rejected') as AssociateApprovalStatus }
        : a
    ),
    error: null
  })),
  on(Actions.decideApprovalFailure, (state, { error }) => ({
    ...state,
    decidingApproval: false,
    error
  })),

  on(Actions.resetAttributionState, () => initialState)
);
