export interface QuestionDTO {
    id: string;
    questionText: string;
    multiSelect: boolean;
    options: { id: string; text: string }[];
  }
  
  export interface LearnAnswerReq {
    questionId: string;
    selected: string[];
    lang: 'en' | 'pl';
  }
  
  export interface ExplanationDTO {
    text: string;
    url: string;
  }
  
  export interface LearnAnswerRes {
    isCorrect: boolean;
    correctOptionIds: string[];
    explanations: Record<string, ExplanationDTO>;
  }
  
  export interface StartExamRes {
    examId: string;
    durationSec: number;
    questions: QuestionDTO[];
  }
  
  export interface ExamFinishRes {
    scorePercent: number;
    correct: number;
    wrong: number;
    passed: boolean | null;
    items: {
      questionId: string;
      questionText: string;
      selected: string[];
      correct: string[];
      explanationsEn: Record<string, ExplanationDTO>;
      explanationsPl: Record<string, ExplanationDTO>;
      wasCorrect: boolean;
    }[];
  }
  
  export interface ExamSummary {
    id: string;
    startedAt: string;
    finishedAt?: string;
    durationSec: number;
    scorePercent?: number;
    questionCount: number;
    passed?: boolean | null;
  }

  // Voting interfaces
  export interface VoteStatusRes {
    hasVoted: boolean;
    vote?: boolean;
    trustScore: number;
  }

  export interface VoteReq {
    vote: boolean;
    publicId: string;
  }

  export interface VoteRes {
    trustScore: number;
    vote: boolean;
  }
  