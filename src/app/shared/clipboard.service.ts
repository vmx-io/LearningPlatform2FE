import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  async copy(text: string): Promise<boolean> {
    // Try modern API first
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // continue to fallback
    }

    // Fallback: hidden textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
