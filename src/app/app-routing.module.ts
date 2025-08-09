import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LearnComponent } from './pages/learn/learn.component';
import { ExamComponent } from './pages/exam/exam.component';
import { ExamReviewComponent } from './pages/exam-review/exam-review.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { StatsComponent } from './pages/stats/stats.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'learn', component: LearnComponent },
  { path: 'exam', component: ExamComponent },
  { path: 'exam/:id/review', component: ExamReviewComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'stats', component: StatsComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
