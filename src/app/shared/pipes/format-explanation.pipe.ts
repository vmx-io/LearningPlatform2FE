import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatExplanation',
  standalone: true,
})
export class FormatExplanationPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    // Remove bracketed references like [1], [1, 2], [see docs], etc.
    let cleaned = value.replace(/\[[^\]]*\]/g, '');
    // Convert **bold** to <strong>bold</strong>
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return cleaned;
  }
}
