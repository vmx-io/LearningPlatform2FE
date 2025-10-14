import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { CommentsService } from '../../core/services/comments.service';
import { Comment } from '../../core/models/api.models';

@Component({
  selector: 'app-comments-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comments-section.component.html',
  styleUrls: ['./comments-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentsSectionComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) questionId!: string;

  // State signals
  comments = signal<Comment[]>([]);
  loading = signal(false);
  posting = signal(false);
  editing = signal<number | null>(null);
  deleting = signal<number | null>(null);
  liking = signal<number | null>(null);
  isExpanded = signal(false);
  newCommentContent = signal('');
  editContent = signal('');

  private destroy$ = new Subject<void>();

  // Computed properties
  isAuthenticated = computed(() => this.commentsService.isAuthenticated());
  sortedComments = computed(() => {
    const comments = this.comments();
    if (!comments || !Array.isArray(comments)) {
      return [];
    }
    return [...comments].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  constructor(private commentsService: CommentsService) {}

  ngOnInit(): void {
    this.loadComments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload comments when questionId changes
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      this.loadComments();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded(): void {
    this.isExpanded.update(expanded => !expanded);
  }

  loadComments(): void {
    // Clear existing comments first to avoid showing stale data
    this.comments.set([]);
    this.loading.set(true);
    
    this.commentsService.getComments(this.questionId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (comments) => {
          // Ensure comments is always an array
          this.comments.set(Array.isArray(comments) ? comments : []);
        },
        error: (error) => {
          console.error('Failed to load comments:', error);
          // Set empty array on error to prevent iteration issues
          this.comments.set([]);
          // Could show toast notification here
        }
      });
  }

  postComment(): void {
    const content = this.newCommentContent().trim();
    if (!content || this.posting()) return;

    this.posting.set(true);
    this.commentsService.createComment(this.questionId, content)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.posting.set(false))
      )
      .subscribe({
        next: (newComment) => {
          this.comments.update(comments => {
            const currentComments = Array.isArray(comments) ? comments : [];
            return [...currentComments, newComment];
          });
          this.newCommentContent.set('');
        },
        error: (error) => {
          console.error('Failed to post comment:', error);
          // Could show toast notification here
        }
      });
  }

  startEdit(comment: Comment): void {
    this.editing.set(comment.id);
    this.editContent.set(comment.content);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.editContent.set('');
  }

  saveEdit(commentId: number): void {
    const content = this.editContent().trim();
    if (!content || this.deleting()) return;

    this.deleting.set(commentId);
    this.commentsService.updateComment(commentId, content)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.deleting.set(null))
      )
      .subscribe({
        next: (updatedComment) => {
          this.comments.update(comments => {
            const currentComments = Array.isArray(comments) ? comments : [];
            return currentComments.map(c => c.id === commentId ? updatedComment : c);
          });
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Failed to update comment:', error);
          // Could show toast notification here
        }
      });
  }

  deleteComment(commentId: number): void {
    if (this.deleting()) return;

    this.deleting.set(commentId);
    this.commentsService.deleteComment(commentId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.deleting.set(null))
      )
      .subscribe({
        next: () => {
          this.comments.update(comments => {
            const currentComments = Array.isArray(comments) ? comments : [];
            return currentComments.filter(c => c.id !== commentId);
          });
        },
        error: (error) => {
          console.error('Failed to delete comment:', error);
          // Could show toast notification here
        }
      });
  }

  toggleLike(comment: Comment): void {
    if (this.liking()) return;

    this.liking.set(comment.id);
    
    // Optimistic update - update UI immediately
    const newLikedState = !comment.likedByCurrentUser;
    const newLikesCount = comment.likesCount + (newLikedState ? 1 : -1);
    
    this.comments.update(comments => {
      const currentComments = Array.isArray(comments) ? comments : [];
      return currentComments.map(c => 
        c.id === comment.id 
          ? { ...c, likesCount: newLikesCount, likedByCurrentUser: newLikedState }
          : c
      );
    });

    // Then make the API call
    const action = comment.likedByCurrentUser 
      ? this.commentsService.unlikeComment(comment.id)
      : this.commentsService.likeComment(comment.id);

    action.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.liking.set(null))
    ).subscribe({
      next: (response) => {
        // Reload comments to get updated likedByCurrentUser flags for all comments
        this.loadComments();
      },
      error: (error) => {
        console.error('Failed to toggle like:', error);
        // Revert optimistic update on error
        this.comments.update(comments => {
          const currentComments = Array.isArray(comments) ? comments : [];
          return currentComments.map(c => 
            c.id === comment.id 
              ? { ...c, likesCount: comment.likesCount, likedByCurrentUser: comment.likedByCurrentUser }
              : c
          );
        });
        // Could show toast notification here
      }
    });
  }

  formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  isOwnComment(comment: Comment): boolean {
    const currentPublicId = this.commentsService.getCurrentPublicId();
    if (!currentPublicId) {
      return false;
    }
    return comment.userPublicId === currentPublicId;
  }
}
