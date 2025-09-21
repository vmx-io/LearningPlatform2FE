import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { QuestionDTO } from '../../core/models/api.models';
import { FormatExplanationPipe } from '../../shared/pipes/format-explanation.pipe';

type Feedback = {
  isCorrect: boolean;
  correct: string[];
  explanations: Record<string, { text: string; url: string }>;
};

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatExplanationPipe],
  templateUrl: './learn.component.html',
  styleUrls: ['./learn.component.scss'],
})
export class LearnComponent {
  loading = signal(true);
  mode = signal<'picker' | 'learn'>('picker');

  // tag selection
  selectedTag = signal<string | null>(null);
  tags = signal<{ tag: string; count: number }[]>([]);

  // questions & nav
  questions = signal<QuestionDTO[]>([]);
  currentIdx = signal(0);

  // selections & feedback (cache per question id)
  selectionsByQid = signal<Record<string, Record<string, boolean>>>({});
  feedbackByQid = signal<Record<string, Feedback | null>>({});

  // jump modal
  showJump = signal(false);
  jumpValueStr = '';

  // explanation modal
  showExplanationModal = signal(false);
  explanationLoading = signal(false);
  explanationContent = signal<string | null>(null);

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // react to ?tag=...
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tag');

      if (t === '__ALL__') {
        // learn mode with ALL questions
        this.mode.set('learn');
        this.selectedTag.set(null);     // show "All questions" label
        this.loadQuestions(undefined);  // no filter
        return;
      }

      if (!t) {
        this.mode.set('picker');
        this.selectedTag.set(null);
        this.loadTags();
      } else {
        this.mode.set('learn');
        this.selectedTag.set(t);
        this.loadQuestions(t);
      }
    });
  }

  // ----- data loads -----

  private loadTags() {
    this.loading.set(true);
    this.api.getTags().subscribe({
      next: (list) => {
        this.tags.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadQuestions(tag?: string) {
    this.loading.set(true);
    this.api.getQuestions(tag || undefined).subscribe({
      next: (qs) => {
        this.questions.set(qs);
        this.currentIdx.set(0);
        this.loading.set(false);
        // nie czyścimy cache'ów wyborów/feedbacku przy zmianie kategorii — ale możesz:
        // this.selectionsByQid.set({});
        // this.feedbackByQid.set({});
      },
      error: () => this.loading.set(false),
    });
  }

  // ----- navigation & helpers -----

  get q() {
    return this.questions()[this.currentIdx()];
  }

  selection = computed<Record<string, boolean>>(() => {
    const q = this.q;
    if (!q) return {};
    return this.selectionsByQid()[q.id] ?? {};
  });

  feedback = computed<Feedback | null>(() => {
    const q = this.q;
    if (!q) return null;
    return this.feedbackByQid()[q.id] ?? null;
  });

  toggle(opt: string) {
    const q = this.q;
    if (!q) return;
    const all = { ...this.selectionsByQid() };
    const cur = { ...(all[q.id] ?? {}) };
    if (!q.multiSelect) Object.keys(cur).forEach((k) => (cur[k] = false));
    cur[opt] = !cur[opt];
    all[q.id] = cur;
    this.selectionsByQid.set(all);
  }

  submit() {
    const q = this.q;
    if (!q) return;
    const selected = Object.entries(this.selection())
      .filter(([, v]) => v)
      .map(([k]) => k);
    this.api
      .learnAnswer({ questionId: q.id, selected, lang: 'en' })
      .subscribe((res) => {
        const fb: Feedback = {
          isCorrect: res.isCorrect,
          correct: res.correctOptionIds,
          explanations: res.explanations,
        };
        const all = { ...this.feedbackByQid() };
        all[q.id] = fb;
        this.feedbackByQid.set(all);
      });
  }

  private clamp(i: number) {
    const n = this.questions().length;
    if (n === 0) return 0;
    if (i < 0) return 0;
    if (i > n - 1) return n - 1;
    return i;
  }

  goTo(idx: number) {
    this.currentIdx.set(this.clamp(idx));
  }
  prev() {
    this.goTo(this.currentIdx() - 1);
  }
  next() {
    this.goTo(this.currentIdx() + 1);
  }
  random() {
    const n = this.questions().length;
    if (n < 2) return;
    let r = Math.floor(Math.random() * n);
    if (r === this.currentIdx()) r = (r + 1) % n;
    this.goTo(r);
  }

  pageWindow = computed<number[]>(() => {
    const n = this.questions().length;
    if (n === 0) return [];
    const cur = this.currentIdx();
    let start = cur - 2,
      end = cur + 2;
    if (start < 0) {
      end += -start;
      start = 0;
    }
    if (end > n - 1) {
      const over = end - (n - 1);
      start = Math.max(0, start - over);
      end = n - 1;
    }
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  openJump() {
    this.jumpValueStr = String(this.currentIdx() + 1);
    this.showJump.set(true);
  }
  closeJump() {
    this.showJump.set(false);
  }
  confirmJump() {
    const n = this.questions().length;
    const val = parseInt(this.jumpValueStr, 10);
    if (!Number.isFinite(val)) return;
    const target = Math.min(Math.max(val, 1), n) - 1;
    this.goTo(target);
    this.closeJump();
  }

  isSelected(opt: string) {
    return !!this.selection()[opt];
  }

  resetCurrent() {
    const q = this.q;
    if (!q) return;
    const selAll = { ...this.selectionsByQid() };
    const fbAll = { ...this.feedbackByQid() };
    delete selAll[q.id];
    delete fbAll[q.id];
    this.selectionsByQid.set(selAll);
    this.feedbackByQid.set(fbAll);
  }

  // picker actions
  startWithTag(tag: string) {
    // przejście do trybu learn z wybraną kategorią
    this.router.navigate([], { queryParams: { tag } });
  }
  startAll() {
    this.router.navigate([], { queryParams: { tag: '__ALL__' } });
  }
  backToPicker() {
    this.router.navigate([], { queryParams: {} });
  }

  // explanation modal methods
  showExplanation() {
    const q = this.q;
    if (!q) return;
    
    this.showExplanationModal.set(true);
    this.explanationLoading.set(true);
    this.explanationContent.set(null);
    
    this.api.getQuestionExplanation(q.id).subscribe({
      next: (htmlContent) => {
        this.explanationContent.set(htmlContent);
        this.explanationLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load explanation:', error);
        this.explanationContent.set(null);
        this.explanationLoading.set(false);
      }
    });
  }

  closeExplanation() {
    this.showExplanationModal.set(false);
    this.explanationContent.set(null);
    this.explanationLoading.set(false);
  }
}
