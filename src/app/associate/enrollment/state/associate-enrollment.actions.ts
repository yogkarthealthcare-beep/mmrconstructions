import { createAction, props } from '@ngrx/store';

export const submitForm = createAction(
  '[Associate Enrollment] Submit Form',
  props<{ formData: FormData }>()
);

export const submitFormSuccess = createAction(
  '[Associate Enrollment] Submit Form Success',
  props<{ associateId: string }>()
);

export const submitFormFailure = createAction(
  '[Associate Enrollment] Submit Form Failure',
  props<{ error: string }>()
);

export const resetFormState = createAction(
  '[Associate Enrollment] Reset Form State'
);
