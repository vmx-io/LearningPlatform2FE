import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';

type StatsResponse = {
  totalExams: number;
  completedExams: number;
  averageScore?: number | null;
  totalAnswers: number;
  correctAnswers: number;
  accuracyOverall?: number | null;
  answersLast30d: number;
  correctLast30d: number;
  accuracyLast30d?: number | null;
  accuracyByTag?: Record<string, number>;
  answeredByTag?: Record<string, number>;
  passedExams?: number;
  failedExams?: number;
  passRate?: number | null;
};

type ExamsPage = {
  total: number;
  limit: number;
  offset: number;
  items: {
    id: string;
    startedAt: string;
    finishedAt?: string;
    durationSec: number;
    scorePercent?: number;
    questionCount: number;
    passed?: boolean | null;
  }[];
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnInit {
  // Global stats
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<StatsResponse | null>(null);

  // Per-tag summary + picker
  tagsLoading = signal(true);
  tagsError = signal<string | null>(null);
  tags = signal<{ tag: string; count: number }[]>([]);
  summaryLoading = signal(true);
  summaryError = signal<string | null>(null);
  summary = signal<{ tag: string; answered: number; correct: number; accuracy: number }[]>([]);
  selectedTag = signal<string | null>(null);

  // Per-tag detail window
  detailLoading = signal(false);
  detailError = signal<string | null>(null);
  windowDays = signal(30);
  detail = signal<{ tag: string; windowDays: number; totalAnswers: number; correctAnswers: number; accuracy?: number | null; completedExams: number } | null>(null);

  // Exams list
  examsLoading = signal(true);
  examsError = signal<string | null>(null);
  exams = signal<ExamsPage | null>(null);
  pageSize = signal(10);
  page = signal(1); // 1-based

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // global stats
    this.api.getStats().subscribe({
      next: (res) => { this.data.set(res as StatsResponse); this.loading.set(false); },
      error: () => { this.error.set('Failed to load stats'); this.loading.set(false); }
    });

    // tags for picker
    this.api.getTags().subscribe({
      next: (res) => { this.tags.set(res); this.tagsLoading.set(false); },
      error: () => { this.tagsError.set('Failed to load categories'); this.tagsLoading.set(false); }
    });

    // per-tag summary
    this.api.getStatsSummary().subscribe({
      next: (res) => { this.summary.set(res); this.summaryLoading.set(false); },
      error: () => { this.summaryError.set('Failed to load per-tag summary'); this.summaryLoading.set(false); }
    });

    // exams (first page)
    this.loadPage(1);
  }

  // Derived
  tagRows = computed(() => {
    // join /tags (counts) + /stats/summary (answered/accuracy)
    const byTagSummary = new Map(this.summary().map(r => [r.tag, r]));
    const rows = this.tags().map(t => {
      const s = byTagSummary.get(t.tag);
      return {
        tag: t.tag,
        available: t.count,                    // ile pytań w bazie
        answered: s?.answered ?? 0,            // ile odpowiedzi oddano
        accuracy: s?.accuracy ?? 0
      };
    });
    // sort: najwięcej odpowiedzi najpierw
    return rows.sort((a,b) => b.answered - a.answered || a.tag.localeCompare(b.tag));
  });

  selectedSummaryRow = computed(() => {
    const tag = this.selectedTag();
    if (!tag) return null;
    return this.summary().find(r => r.tag === tag) ?? null;
  });

  pagesTotal = computed(() => {
    const ex = this.exams(); if (!ex) return 1;
    return Math.max(1, Math.ceil(ex.total / ex.limit));
  });

  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.pagesTotal());

  // Actions
  loadPage(p: number) {
    const limit = this.pageSize();
    const offset = (p - 1) * limit;
    this.examsLoading.set(true);
    this.examsError.set(null);
    this.api.listExams(limit, offset).subscribe({
      next: (res) => {
        this.exams.set(res as ExamsPage);
        this.page.set(p);
        this.examsLoading.set(false);
      },
      error: () => {
        this.examsError.set('Failed to load exams');
        this.examsLoading.set(false);
      }
    });
  }

  pickTag(tag: string) {
    this.selectedTag.set(tag);
    this.loadDetail(); // auto-load detail for current windowDays
  }

  closeModal() {
    this.selectedTag.set(null);
  }

  changeWindowDays(days: number) {
    this.windowDays.set(days);
    if (this.selectedTag()) this.loadDetail();
  }

  loadDetail() {
    const tag = this.selectedTag(); if (!tag) return;
    const days = this.windowDays();
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.api.getStatsByTag(tag, days).subscribe({
      next: (res) => { this.detail.set(res); this.detailLoading.set(false); },
      error: () => { this.detailError.set('Failed to load tag stats'); this.detailLoading.set(false); }
    });
  }

  // helpers
  toPercent(v?: number | null) {
    return v == null ? '—' : `${v.toFixed(2)}%`;
  }
}
