import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  LearnAnswerReq, LearnAnswerRes,
  QuestionDTO, StartExamRes, ExamFinishRes, ExamSummary
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) {}

  // Questions
  getQuestions() {
    return this.http.get<QuestionDTO[]>(`${this.base}/questions`, { withCredentials: true });
  }

  // Learning
  learnAnswer(body: LearnAnswerReq) {
    return this.http.post<LearnAnswerRes>(`${this.base}/learn/answer`, body, { withCredentials: true });
  }

  // Exams
  startExam(count = 80, durationSec = 10800) {
    return this.http.post<StartExamRes>(`${this.base}/exams`, { count: Number(count), durationSec: Number(durationSec) }, { withCredentials: true });
  }
  answerExam(examId: string, questionId: string, selected: string[]) {
    return this.http.post(`${this.base}/exams/${examId}/answer?questionId=${questionId}`, { selected }, { withCredentials: true });
  }
  finishExam(examId: string) {
    return this.http.post<ExamFinishRes>(`${this.base}/exams/${examId}/finish`, {}, { withCredentials: true });
  }
  listExams(limit=20, offset=0) {
    return this.http.get<{ total:number; limit:number; offset:number; items: ExamSummary[] }>(
      `${this.base}/exams?limit=${limit}&offset=${offset}`, { withCredentials: true });
  }

  // Profile
  getMe() { return this.http.get<{ publicId: string; displayName?: string }>(`${this.base}/me`, { withCredentials: true }); }
  updateMe(displayName: string) { return this.http.put(`${this.base}/me`, { displayName }, { withCredentials: true }); }
  exportKey() { return this.http.get<{ publicId: string }>(`${this.base}/me/export-key`, { withCredentials: true }); }
  restore(publicId: string) { return this.http.post(`${this.base}/me/restore`, { publicId }, { withCredentials: true }); }

  // Stats
  getStats() { return this.http.get<any>(`${this.base}/stats`, { withCredentials: true }); }
}
