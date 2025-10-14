import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment, CreateCommentReq, UpdateCommentReq, CommentLikeRes } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private base = environment.production ? environment.apiBase : environment.apiBaseLocal;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const publicId = localStorage.getItem('publicId');
    return new HttpHeaders(publicId ? { 'X-Public-Id': publicId } : {});
  }

  /**
   * Get all comments for a specific question
   */
  getComments(questionId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.base}/questions/${encodeURIComponent(questionId)}/comments`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Create a new comment for a question
   */
  createComment(questionId: string, content: string): Observable<Comment> {
    const body: CreateCommentReq = { content };
    return this.http.post<Comment>(
      `${this.base}/questions/${encodeURIComponent(questionId)}/comments`,
      body,
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Update an existing comment
   */
  updateComment(commentId: number, content: string): Observable<Comment> {
    const body: UpdateCommentReq = { content };
    return this.http.put<Comment>(
      `${this.base}/comments/${commentId}`,
      body,
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/comments/${commentId}`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Like a comment
   */
  likeComment(commentId: number): Observable<CommentLikeRes> {
    return this.http.post<CommentLikeRes>(
      `${this.base}/comments/${commentId}/like`,
      {},
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Unlike a comment
   */
  unlikeComment(commentId: number): Observable<CommentLikeRes> {
    return this.http.delete<CommentLikeRes>(
      `${this.base}/comments/${commentId}/like`,
      { headers: this.headers(), withCredentials: true }
    );
  }

  /**
   * Check if user is authenticated (has publicId)
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('publicId');
  }
}
