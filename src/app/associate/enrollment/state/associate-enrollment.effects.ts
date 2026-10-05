import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ApiService } from '../../../services/api.service';
import * as AssociateEnrollmentActions from './associate-enrollment.actions';
import { catchError, map, mergeMap, of } from 'rxjs';

@Injectable()
export class AssociateEnrollmentEffects {
  constructor(
    private actions$: Actions,
    private apiService: ApiService
  ) {}

  submitForm$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssociateEnrollmentActions.submitForm),
      mergeMap(({ formData }) =>
        this.apiService.postForm('/api/associate-enrollment', formData).pipe(
          map((response) => {
            if (response.success) {
              return AssociateEnrollmentActions.submitFormSuccess({ associateId: response.data.associateId });
            } else {
              return AssociateEnrollmentActions.submitFormFailure({ error: response.message || 'Submission failed' });
            }
          }),
          catchError((error) => {
            let errMsg = error?.error?.message || error?.message || 'Server error occurred';
            if (error?.error?.errors && Array.isArray(error.error.errors) && error.error.errors.length > 0) {
              const fieldErrors = error.error.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ');
              errMsg = `Validation error: ${fieldErrors}`;
            }
            return of(
              AssociateEnrollmentActions.submitFormFailure({
                error: errMsg
              })
            );
          })
        )
      )
    )
  );
}
