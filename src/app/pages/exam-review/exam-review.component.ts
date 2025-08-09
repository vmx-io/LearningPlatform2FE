import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ExplanationDTO } from '../../core/models/api.models';
import { FormsModule } from '@angular/forms';

type ReviewItem = {
  questionId: string;
  questionText: string;
  selected: string[];
  correct: string[];
  explanationsEn: Record<string, ExplanationDTO>;
  explanationsPl: Record<string, ExplanationDTO>;
  wasCorrect: boolean;
};

type ExamDetail = {
  examId: string;
  startedAt: string;
  finishedAt?: string;
  durationSec: number;
  scorePercent?: number | null;
  passed?: boolean | null;
  correct: number;
  wrong: number;
  items: ReviewItem[];
};

@Component({
  selector: 'app-exam-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-review.component.html',
  styleUrls: ['./exam-review.component.scss'],
})
export class ExamReviewComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  exam = signal<ExamDetail | null>(null);

  lang = signal<'en' | 'pl'>('en');

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public router: Router,          // make public if you want to access in template, or use methods below
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Missing exam id'); this.loading.set(false); return; }

    // Ensure cookie-based user exists (no-op if already set)
    this.api.getMe().subscribe({ next: () => {}, error: () => {} });

    fetch(`/api/v1/exams/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { this.exam.set(data as ExamDetail); this.loading.set(false); })
      .catch(() => { this.error.set('Failed to load exam'); this.loading.set(false); });
  }

  items = computed(() => this.exam()?.items ?? []);

  expFor(item: ReviewItem, key: string): ExplanationDTO | undefined {
    const map = this.lang() === 'en' ? item.explanationsEn : item.explanationsPl;
    return map?.[key];
  }

  isCorrectKey(item: ReviewItem, key: string) {
    return item.correct.includes(key);
  }

  wasSelected(item: ReviewItem, key: string) {
    return item.selected.includes(key);
  }

  goBack() {
    this.location.back();
  }

  startNew() {
    this.router.navigate(['/exam']);
  }
}
