import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../services/language.service';

@Pipe({
  name: 'tr',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  constructor(private language: LanguageService) {}

  transform(key: string): string {
    return this.language.translate(key);
  }
}
