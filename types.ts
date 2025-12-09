
export interface ExerciseLog {
  id: string;
  type: 'active' | 'stretch';
  minutes: number;
  timestamp: string;
}

export interface HygieneLog {
  id: string;
  type: 'morning' | 'night' | 'other';
  timestamp: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  waterClicks: number; // 1 click = 1 sip/glass (approx 250ml)
  
  // Legacy fields (kept for migration)
  exerciseStarted?: boolean; 
  exerciseMinutes?: number; 
  exerciseType?: 'active' | 'stretch'; 
  showerType?: 'none' | 'night' | 'morning';

  // New array fields for multiple entries
  exercises: ExerciseLog[];
  hygieneLogs: HygieneLog[];

  sleepTime: string | null; // HH:mm
  isAnimalMode: boolean; // Did they activate animal mode today?
}

export type FeedbackType = 'water' | 'exercise' | 'sleep' | 'general' | 'animal';

export interface AppState {
  logs: Record<string, DailyLog>; // Keyed by YYYY-MM-DD
  isAnimalModeActive: boolean; // Current session state
}

export const DEFAULT_LOG: DailyLog = {
  date: '',
  waterClicks: 0,
  exerciseStarted: false,
  exercises: [], // Default empty
  hygieneLogs: [], // Default empty
  sleepTime: null,
  showerType: 'none',
  isAnimalMode: false,
};
