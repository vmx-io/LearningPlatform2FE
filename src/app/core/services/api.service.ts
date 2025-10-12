import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LearnAnswerReq, LearnAnswerRes,
  QuestionDTO, StartExamRes, ExamFinishRes, ExamSummary,
  VoteStatusRes, VoteReq, VoteRes
} from '../models/api.models';

const PUBKEY = 'publicId';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.production ? environment.apiBase : environment.apiBaseLocal;

  constructor(private http: HttpClient) {}

  // ---- Public ID helpers (frontend-side identity fallback) ----
  get publicId(): string | null {
    return localStorage.getItem(PUBKEY);
  }
  set publicId(id: string | null) {
    if (id) localStorage.setItem(PUBKEY, id);
    else localStorage.removeItem(PUBKEY);
  }

  getExam(examId: string) {
    return this.http.get(
      `${this.base}/exams/${encodeURIComponent(examId)}`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  private headers(): HttpHeaders {
    const id = this.publicId;
    return new HttpHeaders(id ? { 'X-Public-Id': id } : {});
  }

  // You can call this once on app start to prime the publicId.
  // Example usage: api.getMe().subscribe()
  // It stores publicId from the response if present.
  getMe() {
    return this.http.get<{ publicId: string; displayName?: string }>(
      `${this.base}/me`,
      { headers: this.headers(), withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res?.publicId) this.publicId = res.publicId;
      })
    );
  }

  // ---- Profile ----
  updateMe(displayName: string) {
    return this.http.put(
      `${this.base}/me`,
      { displayName },
      { headers: this.headers(), withCredentials: true }
    );
  }

  exportKey() {
    return this.http.get<{ publicId: string }>(
      `${this.base}/me/export-key`,
      { headers: this.headers(), withCredentials: true }
    ).pipe(
      tap((res) => {
        if (res?.publicId) this.publicId = res.publicId;
      })
    );
  }

  restore(publicId: string) {
    // Persist immediately so subsequent calls also include the header
    this.publicId = publicId;
    return this.http.post(
      `${this.base}/me/restore`,
      { publicId },
      { headers: this.headers(), withCredentials: true }
    );
  }

  // ---- Questions (learn mode) ----
  // getQuestions() {
  //   return this.http.get<QuestionDTO[]>(
  //     `${this.base}/questions`,
  //     { headers: this.headers(), withCredentials: true }
  //   );
  // }

  learnAnswer(body: LearnAnswerReq) {
    return this.http.post<LearnAnswerRes>(
      `${this.base}/learn/answer`,
      body,
      { headers: this.headers(), withCredentials: true }
    );
  }

  // ---- Exams ----
  startExam(count = 80, durationSec = 10800) {
    return this.http.post<StartExamRes>(
      `${this.base}/exams`,
      { count: Number(count), durationSec: Number(durationSec) },
      { headers: this.headers(), withCredentials: true }
    );
  }

  answerExam(examId: string, questionId: string, selected: string[]) {
    const q = encodeURIComponent(questionId);
    return this.http.post(
      `${this.base}/exams/${examId}/answer?questionId=${q}`,
      { selected },
      { headers: this.headers(), withCredentials: true }
    );
  }

  finishExam(examId: string) {
    return this.http.post<ExamFinishRes>(
      `${this.base}/exams/${examId}/finish`,
      {},
      { headers: this.headers(), withCredentials: true }
    );
  }

  listExams(limit = 20, offset = 0) {
    return this.http.get<{ total: number; limit: number; offset: number; items: ExamSummary[] }>(
      `${this.base}/exams?limit=${limit}&offset=${offset}`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  // ---- Stats ----
  getStats() {
    return this.http.get<any>(
      `${this.base}/stats`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  getQuestions(tag?: string) {
    const url = tag ? `${this.base}/questions?tag=${encodeURIComponent(tag)}` : `${this.base}/questions`;
    return this.http.get<QuestionDTO[]>(url, { withCredentials: true });
  }

  getTags() {
    return this.http.get<{ tag: string; count: number }[]>(
      `${this.base}/tags`,
      { headers: this.headers(), withCredentials: true }
    );
  }
  
  getStatsSummary() {
    return this.http.get<{ tag: string; answered: number; correct: number; accuracy: number }[]>(
      `${this.base}/stats/summary`,
      { headers: this.headers(), withCredentials: true }
    );
  }
  
  getStatsByTag(tag: string, days = 30) {
    const p = new URLSearchParams({ tag, days: String(days) });
    return this.http.get<{
      tag: string;
      windowDays: number;
      totalAnswers: number;
      correctAnswers: number;
      accuracy?: number | null;
      completedExams: number;
    }>(`${this.base}/stats/by-tag?${p.toString()}`, { headers: this.headers(), withCredentials: true });
  }

  getQuestionExplanation(questionId: string) {
    return this.http.get(
      `${this.base}/questions/explanation/${encodeURIComponent(questionId)}`,
      { headers: this.headers(), withCredentials: true, responseType: 'text' }
    );
  }

  // ---- Voting ----
  getQuestionVote(questionId: string, publicId: string) {
    const params = new URLSearchParams({ publicId });
    return this.http.get<VoteStatusRes>(
      `${this.base}/questions/${encodeURIComponent(questionId)}/vote?${params.toString()}`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  voteQuestion(questionId: string, vote: boolean, publicId: string) {
    const body: VoteReq = { vote, publicId };
    return this.http.post<VoteRes>(
      `${this.base}/questions/${encodeURIComponent(questionId)}/vote`,
      body,
      { headers: this.headers(), withCredentials: true }
    );
  }
}
