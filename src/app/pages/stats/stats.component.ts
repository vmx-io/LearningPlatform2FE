import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnInit {
  // Stats
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<StatsResponse | null>(null);

  // Exams list
  examsLoading = signal(true);
  examsError = signal<string | null>(null);
  exams = signal<ExamsPage | null>(null);
  pageSize = signal(10);
  page = signal(1); // 1-based

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // stats
    this.api.getStats().subscribe({
      next: (res) => { this.data.set(res as StatsResponse); this.loading.set(false); },
      error: () => { this.error.set('Failed to load stats'); this.loading.set(false); }
    });

    // exams (first page)
    this.loadPage(1);
  }

  // Derived
  tagRows = computed(() => {
    const d = this.data(); if (!d || !d.accuracyByTag) return [];
    const acc = d.accuracyByTag ?? {};
    const cnt = d.answeredByTag ?? {};
    return Object.keys(acc)
      .map(tag => ({ tag, accuracy: acc[tag], answered: cnt[tag] ?? 0 }))
      .sort((a,b) => b.answered - a.answered);
  });

  pagesTotal = computed(() => {
    const ex = this.exams(); if (!ex) return 1;
    return Math.max(1, Math.ceil(ex.total / ex.limit));
  });

  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.pagesTotal());

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

  // helpers
  toPercent(v?: number | null) {
    return v == null ? '—' : `${v.toFixed(2)}%`;
  }
}
