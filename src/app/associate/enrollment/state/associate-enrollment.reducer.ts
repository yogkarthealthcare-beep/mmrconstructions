import { createReducer, on } from '@ngrx/store';
import * as AssociateEnrollmentActions from './associate-enrollment.actions';

export interface AssociateEnrollmentState {
  loading: boolean;
  associateId: string | null;
  error: string | null;
  success: boolean;
}

export const initialState: AssociateEnrollmentState = {
  loading: false,
  associateId: null,
  error: null,
  success: false
};

export const associateEnrollmentReducer = createReducer(
  initialState,
  on(AssociateEnrollmentActions.submitForm, (state) => ({
    ...state,
    loading: true,
    error: null,
    success: false
  })),
  on(AssociateEnrollmentActions.submitFormSuccess, (state, { associateId }) => ({
    ...state,
    loading: false,
    associateId,
    success: true,
    error: null
  })),
  on(AssociateEnrollmentActions.submitFormFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    success: false
  })),
  on(AssociateEnrollmentActions.resetFormState, () => initialState)
);
