import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideStore, provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { bookingAttributionReducer } from './store/booking-attribution/booking-attribution.reducer';
import { BookingAttributionEffects } from './store/booking-attribution/booking-attribution.effects';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    ),
    provideStore(),
    provideState({ name: 'bookingAttribution', reducer: bookingAttributionReducer }),
    provideEffects([BookingAttributionEffects]),

    // 🔥 Firebase Init
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAnalytics(() => getAnalytics())
  ]
};