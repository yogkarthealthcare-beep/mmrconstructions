import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, from } from 'rxjs';
import { RazorpayCheckoutDetails, RazorpayVerifyRequest, VerifyResponse } from './payment.types';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  private scriptLoaded = false;

  constructor(private api: ApiService) {}

  /**
   * Dynamically loads the Razorpay checkout script if not already present.
   */
  loadScript(): Observable<boolean> {
    if (this.scriptLoaded || typeof window === 'undefined') {
      return from(Promise.resolve(true));
    }

    // Check if script is already present in DOM
    if ((window as any).Razorpay) {
      this.scriptLoaded = true;
      return from(Promise.resolve(true));
    }

    return new Observable<boolean>((observer) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        observer.next(true);
        observer.complete();
      };
      script.onerror = () => {
        observer.error(new Error('Failed to load Razorpay Checkout SDK. Check your internet connection.'));
      };
      document.body.appendChild(script);
    });
  }

  /**
   * Opens the Razorpay Checkout SDK popup and triggers verification on success.
   */
  pay(details: RazorpayCheckoutDetails): Observable<VerifyResponse> {
    return new Observable<VerifyResponse>((observer) => {
      this.loadScript().subscribe({
        next: () => {
          const options = {
            ...details,
            handler: (response: any) => {
              const verifyPayload: RazorpayVerifyRequest = {
                order_id: details.order_id,
                razorpay_order_id: response.razorpay_order_id || details.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              };

              this.verifyPayment(verifyPayload).subscribe({
                next: (verifyRes) => {
                  observer.next(verifyRes);
                  observer.complete();
                },
                error: (err) => {
                  observer.error(err);
                }
              });
            },
            modal: {
              ondismiss: () => {
                observer.error({
                  cancelled: true,
                  message: 'Payment checkout window dismissed by user.'
                });
              }
            },
            theme: {
              color: '#1a5c3a' // Matches MMR primary green
            }
          };

          try {
            const rzp = new Razorpay(options);
            rzp.open();
          } catch (e: any) {
            observer.error(new Error('Failed to instantiate Razorpay Checkout widget: ' + e.message));
          }
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Verifies Razorpay payment signature via secure backend APIs.
   */
  private verifyPayment(payload: RazorpayVerifyRequest): Observable<VerifyResponse> {
    return this.api.post('/api/payment/razorpay/verify', payload);
  }
}
