import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ClipboardService } from '../../shared/clipboard.service';

type MeResponse = { publicId: string; displayName?: string | null; email?: string | null };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  me = signal<MeResponse | null>(null);
  displayName = signal<string>('');

  // restore
  showRestore = signal(false);
  restoreId = signal<string>('');

  constructor(private api: ApiService, private clipboard: ClipboardService) {}

  ngOnInit(): void {
    this.api.getMe().subscribe({
      next: (res) => {
        this.me.set(res as MeResponse);
        this.displayName.set(res.displayName ?? '');
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load profile'); this.loading.set(false); }
    });
  }

  saveName() {
    this.ok.set(null); this.error.set(null);
    this.api.updateMe(this.displayName()).subscribe({
      next: () => { this.ok.set('Display name saved'); },
      error: () => { this.error.set('Failed to save'); }
    });
  }

  exportKey() {
    this.ok.set(null); this.error.set(null);
    this.api.exportKey().subscribe({
      next: async (res) => {
        const id = (res as any).publicId as string;
        const ok = await this.clipboard.copy(id);
        this.ok.set(ok ? `Public ID copied to clipboard: ${id}` : 'Copy failed. Please copy manually.');
      },
      error: () => { this.error.set('Failed to export key'); }
    });
  }

  openRestore() {
    this.restoreId.set('');
    this.showRestore.set(true);
  }
  closeRestore() { this.showRestore.set(false); }

  doRestore() {
    this.ok.set(null); this.error.set(null);
    const id = this.restoreId().trim();
    if (!id) { this.error.set('Enter your Public ID'); return; }
    this.api.restore(id).subscribe({
      next: () => {
        // refresh profile
        this.api.getMe().subscribe({
          next: (res) => {
            this.me.set(res as MeResponse);
            this.displayName.set(res.displayName ?? '');
            this.showRestore.set(false);
            this.ok.set('Account restored on this device.');
          }
        });
      },
      error: () => { this.error.set('Restore failed (invalid ID?)'); }
    });
  }
}
