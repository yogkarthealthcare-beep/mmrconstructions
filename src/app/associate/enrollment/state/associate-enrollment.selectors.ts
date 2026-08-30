import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AssociateEnrollmentState } from './associate-enrollment.reducer';

export const selectAssociateEnrollmentState =
  createFeatureSelector<AssociateEnrollmentState>('associateEnrollment');

export const selectLoading = createSelector(
  selectAssociateEnrollmentState,
  (state) => state.loading
);

export const selectAssociateId = createSelector(
  selectAssociateEnrollmentState,
  (state) => state.associateId
);

export const selectError = createSelector(
  selectAssociateEnrollmentState,
  (state) => state.error
);

export const selectSuccess = createSelector(
  selectAssociateEnrollmentState,
  (state) => state.success
);
