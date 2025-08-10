import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { QuestionDTO, StartExamRes } from '../../core/models/api.models';

type StoredExam = {
  examId: string;
  questions: QuestionDTO[];
  startedAt: number;       // epoch ms
  durationSec: number;
  currentIdx: number;
  selectionsByQid: Record<string, Record<string, boolean>>;
};

const SS_KEY = 'exam_state_v1';

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.scss'],
})
export class ExamComponent implements OnInit, OnDestroy {
  // NEW: map modal
  showMap = signal(false);

  // Is question i answered? (based on local selections)
  isAnswered = (i: number) => {
    const q = this.questions()[i];
    if (!q) return false;
    const sel = this.selectionsByQid()[q.id] ?? {};
    return Object.values(sel).some(Boolean);
  };

  // Grid indices 0..N-1 for template
  allIndices = computed<number[]>(() => {
    const n = this.questions().length;
    return Array.from({ length: n }, (_, i) => i);
  });

  openMap() { this.showMap.set(true); }
  closeMap() { this.showMap.set(false); }
  goToFromMap(i: number) { this.goTo(i); this.closeMap(); }

  // UI state
  loading = signal(false);
  error = signal<string | null>(null);

  // Exam state
  examId = signal<string | null>(null);
  questions = signal<QuestionDTO[]>([]);
  durationSec = signal(10800); // 3h default; actual value from server
  startedAt = signal<number | null>(null); // epoch ms
  currentIdx = signal(0);

  // Selections
  selectionsByQid = signal<Record<string, Record<string, boolean>>>({});

  // Timer
  remainingSec = signal<number>(0);
  private timer?: number;

  // Dev controls
  countInput = signal<number>(10); // dev default smaller
  durationInput = signal<number>(1800); // 30m for dev

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
  // If you want to always start fresh, uncomment next line:
  // sessionStorage.removeItem(SS_KEY);

    // Try to restore from sessionStorage
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      try {
        const st = JSON.parse(raw) as StoredExam;
        this.examId.set(st.examId);
        this.questions.set(st.questions);
        this.durationSec.set(st.durationSec);
        this.startedAt.set(st.startedAt);
        this.currentIdx.set(st.currentIdx ?? 0);
        this.selectionsByQid.set(st.selectionsByQid ?? {});
        this.startTimer();
        return;
      } catch { /* ignore */ }
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // Derived
  get q() { return this.questions()[this.currentIdx()]; }

  selection = computed<Record<string, boolean>>(() => {
    const q = this.q;
    if (!q) return {};
    return this.selectionsByQid()[q.id] ?? {};
  });

  savedByIdx = signal<Record<number, boolean>>({});

  isSelected(opt: string) { return !!this.selection()[opt]; }

  // Start exam
  startExam(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.startExam(this.countInput(), this.durationInput()).subscribe({
      next: (res: StartExamRes) => {
        this.examId.set(res.examId);
        this.questions.set(res.questions);
        this.durationSec.set(res.durationSec);
        this.startedAt.set(Date.now());
        this.currentIdx.set(0);
        this.selectionsByQid.set({});
        this.persist();
        this.startTimer();
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set('Failed to start exam');
        this.loading.set(false);
      }
    });
  }

  // Timer
  private startTimer() {
    this.stopTimer();
    this.tick(); // compute immediately
    this.timer = window.setInterval(() => this.tick(), 1000);
  }
  private stopTimer() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
  }
  private tick() {
    const started = this.startedAt();
    if (!started) return;
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const remain = Math.max(0, this.durationSec() - elapsed);
    this.remainingSec.set(remain);
    if (remain <= 0) {
      this.finishExam(); // auto-finish
    }
  }

  // Navigation
  private clamp(i: number) {
    const n = this.questions().length;
    if (n === 0) return 0;
    if (i < 0) return 0;
    if (i > n - 1) return n - 1;
    return i;
  }
  goTo(idx: number) {
    this.currentIdx.set(this.clamp(idx));
    this.persist();
  }
  prev() { this.goTo(this.currentIdx() - 1); }
  next() { this.goTo(this.currentIdx() + 1); }
  pageWindow = computed<number[]>(() => {
    const n = this.questions().length; if (n === 0) return [];
    const cur = this.currentIdx(); let start = cur - 2, end = cur + 2;
    if (start < 0) { end += -start; start = 0; }
    if (end > n - 1) { const over = end - (n - 1); start = Math.max(0, start - over); end = n - 1; }
    const arr: number[] = []; for (let i = start; i <= end; i++) arr.push(i); return arr;
  });

  // Select answers
  toggle(opt: string) {
    const q = this.q; if (!q) return;
    const all = { ...this.selectionsByQid() };
    const cur = { ...(all[q.id] ?? {}) };
    if (!q.multiSelect) {
      Object.keys(cur).forEach(k => cur[k] = false);
    }
    cur[opt] = !cur[opt];
    all[q.id] = cur;
    this.selectionsByQid.set(all);
    this.persist();
  }

// Submit answer for current question
submitCurrent() {
  const id = this.examId(); const q = this.q;
  if (!id || !q) return;

  const selected = Object.entries(this.selection())
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Optimistically clear previous error
  this.error.set(null);

  this.api.answerExam(id, q.id, selected).subscribe({
    next: () => {
      // Mark current index as saved
      const idx = this.currentIdx();
      const map = { ...this.savedByIdx() };
      map[idx] = true;
      this.savedByIdx.set(map);

      // Auto-reset after 3s (remove if you want it to stay green)
      // window.setTimeout(() => {
      //   const cur = { ...this.savedByIdx() };
      //   delete cur[idx];
      //   this.savedByIdx.set(cur);
      // }, 3000);
    },
    error: () => {
      this.error.set('Failed to save answer');
    }
  });
}

  // Finish exam and go to review
  finishExam() {
    const id = this.examId();
    if (!id) return;
    this.stopTimer();
    this.api.finishExam(id).subscribe({
      next: () => {
        // Clear session for the active exam (keep last id if you want)
        sessionStorage.removeItem(SS_KEY);
        this.router.navigate(['/exam', id, 'review']);
      },
      error: () => { this.error.set('Failed to finish exam'); }
    });
  }

  // Persistence
  private persist() {
    const st: StoredExam = {
      examId: this.examId()!,
      questions: this.questions(),
      startedAt: this.startedAt()!,
      durationSec: this.durationSec(),
      currentIdx: this.currentIdx(),
      selectionsByQid: this.selectionsByQid(),
    };
    sessionStorage.setItem(SS_KEY, JSON.stringify(st));
  }

  // UI helpers
  formatTime = computed(() => {
    const s = this.remainingSec();
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n:number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  });

  progressPct = computed(() => {
    const n = this.questions().length || 1;
    return Math.round(((this.currentIdx()+1) / n) * 100);
  });
}
