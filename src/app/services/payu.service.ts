import { Injectable } from '@angular/core';

export interface PayUCheckoutDetails {
  type: 'payu_form';
  action: string;
  method?: 'POST';
  fields: Record<string, string | number | null | undefined>;
}

@Injectable({
  providedIn: 'root'
})
export class PayuService {
  submit(details: PayUCheckoutDetails): void {
    if (!details?.action || !details?.fields) {
      throw new Error('Invalid PayU checkout details.');
    }

    const form = document.createElement('form');
    form.method = details.method || 'POST';
    form.action = details.action;
    form.style.display = 'none';

    Object.entries(details.fields).forEach(([name, value]) => {
      if (value === null || value === undefined) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }
}
