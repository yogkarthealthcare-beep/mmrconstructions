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
          catchError((error) =>
            of(
              AssociateEnrollmentActions.submitFormFailure({
                error: error?.error?.message || error?.message || 'Server error occurred'
              })
            )
          )
        )
      )
    )
  );
}
