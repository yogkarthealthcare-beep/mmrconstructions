import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import * as AttributionActions from './booking-attribution.actions';
import { catchError, map, mergeMap, of } from 'rxjs';

@Injectable()
export class BookingAttributionEffects {
  constructor(
    private actions$: Actions,
    private attributionApi: BookingAttributionApiService
  ) {}

  loadCustomers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AttributionActions.loadBookableCustomers),
      mergeMap(({ search }) =>
        this.attributionApi.getMyBookableCustomers(search).pipe(
          map((customers) => AttributionActions.loadBookableCustomersSuccess({ customers })),
          catchError((err) =>
            of(AttributionActions.loadBookableCustomersFailure({ error: err.message || 'Failed to load customers' }))
          )
        )
      )
    )
  );

  submitBooking$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AttributionActions.submitAttributedBooking),
      mergeMap(({ payload, isAssociate }) =>
        this.attributionApi.createAttributedBooking(payload, isAssociate).pipe(
          map((res) => AttributionActions.submitAttributedBookingSuccess({ booking: res?.data || res })),
          catchError((err) =>
            of(AttributionActions.submitAttributedBookingFailure({ error: err.message || 'Failed to create booking' }))
          )
        )
      )
    )
  );

  loadSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AttributionActions.loadSalesSummary),
      mergeMap(({ teamMemberId }) =>
        this.attributionApi.getTeamMemberSalesSummary(teamMemberId).pipe(
          map((summary) => AttributionActions.loadSalesSummarySuccess({ summary })),
          catchError((err) =>
            of(AttributionActions.loadSalesSummaryFailure({ error: err.message || 'Failed to load summary' }))
          )
        )
      )
    )
  );

  loadApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AttributionActions.loadApprovals),
      mergeMap(({ status, overdueOnly }) =>
        this.attributionApi.getAssociateBookingApprovals(status, overdueOnly).pipe(
          map((approvals) => AttributionActions.loadApprovalsSuccess({ approvals })),
          catchError((err) =>
            of(AttributionActions.loadApprovalsFailure({ error: err.message || 'Failed to load approvals' }))
          )
        )
      )
    )
  );

  decideApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AttributionActions.decideApproval),
      mergeMap(({ bookingId, payload }) =>
        this.attributionApi.decideAssociateApproval(bookingId, payload).pipe(
          map(() => AttributionActions.decideApprovalSuccess({ bookingId, decision: payload.decision })),
          catchError((err) =>
            of(AttributionActions.decideApprovalFailure({ error: err.message || 'Failed to decide approval' }))
          )
        )
      )
    )
  );
}
