import { Directive, ElementRef, Input, OnInit, Renderer2, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appA11yControl]',
  standalone: true
})
export class A11yFormControlDirective implements OnInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private control = inject(NgControl, { optional: true });

  @Input() inputId!: string;
  @Input() errorId?: string;
  @Input() isRequired = false;

  ngOnInit() {
    const input = this.el.nativeElement;
    if (this.inputId) {
      this.renderer.setAttribute(input, 'id', this.inputId);
    }
    if (this.isRequired) {
      this.renderer.setAttribute(input, 'aria-required', 'true');
    }
    if (this.errorId) {
      this.renderer.setAttribute(input, 'aria-describedby', this.errorId);
    }

    if (this.control) {
      this.control.statusChanges?.subscribe(() => {
        const isInvalid = !!(this.control?.invalid && (this.control?.touched || this.control?.dirty));
        this.renderer.setAttribute(input, 'aria-invalid', isInvalid ? 'true' : 'false');
      });
    }
  }
}
