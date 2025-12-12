
import { DailyLog, DEFAULT_LOG } from '../types';

const STORAGE_KEY = 'gentle_keeper_data_v1';

export const getTodayDateString = (): string => {
  const d = new Date();
  // Handle timezone offset simply for local app
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const loadLogs = (): Record<string, DailyLog> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to load data", e);
    return {};
  }
};

export const saveLogs = (logs: Record<string, DailyLog>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};

export const getLogForDate = (date: string, logs: Record<string, DailyLog>): DailyLog => {
  let log = logs[date];
  
  if (!log) {
    return { ...DEFAULT_LOG, date, exercises: [], hygieneLogs: [] };
  }

  // Data Migration: Ensure new arrays exist if loading old data
  const migratedLog = { ...log };

  // Migrate Exercise
  if (!migratedLog.exercises) {
    migratedLog.exercises = [];
    if (migratedLog.exerciseStarted) {
      migratedLog.exercises.push({
        id: 'legacy-' + date,
        type: migratedLog.exerciseType || 'stretch',
        minutes: migratedLog.exerciseMinutes || 1,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Migrate Hygiene
  if (!migratedLog.hygieneLogs) {
    migratedLog.hygieneLogs = [];
    if (migratedLog.showerType && migratedLog.showerType !== 'none') {
      migratedLog.hygieneLogs.push({
        id: 'legacy-shower-' + date,
        type: migratedLog.showerType === 'night' ? 'night' : 'morning',
        timestamp: new Date().toISOString()
      });
    }
  }

  return migratedLog;
};

// Helper to check if a log has any meaningful activity
export const checkActivity = (log: DailyLog | undefined): boolean => {
  if (!log) return false;
  return !!(
    log.waterClicks > 0 || 
    log.exerciseStarted || 
    (log.exercises && log.exercises.length > 0) ||
    (log.hygieneLogs && log.hygieneLogs.length > 0) ||
    log.sleepTime || 
    log.isAnimalMode
  );
};

export const calculateTotalDays = (logs: Record<string, DailyLog>): number => {
  return Object.values(logs).filter(checkActivity).length;
};

export const calculateFlow = (logs: Record<string, DailyLog>): number => {
  // Logic: 
  // 1. Identify all dates with activity.
  // 2. Sort them chronologically.
  // 3. Find the longest chain where the gap between records is <= 3 days (allowing 2 missing days).
  // 4. Return the maximum flow count found in history (High Score logic).

  const activeDates = Object.keys(logs)
    .filter(date => checkActivity(logs[date]))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (activeDates.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let lastDateObj: Date | null = null;

  for (const dateStr of activeDates) {
    const currentDate = new Date(dateStr);
    
    if (!lastDateObj) {
        currentStreak = 1;
    } else {
        const diffTime = Math.abs(currentDate.getTime() - lastDateObj.getTime());
        // Difference in days (e.g., 1st to 2nd is 1 day diff)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        // If difference is 1, 2, or 3 days, the chain continues.
        // Diff 1 = consecutive.
        // Diff 2 = 1 missing day.
        // Diff 3 = 2 missing days.
        // Diff 4 = 3 missing days -> Broken.
        if (diffDays <= 3) {
            currentStreak++;
        } else {
            // Gap was too large, streak broken. Check if this was a new record.
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
        }
    }
    lastDateObj = currentDate;
  }

  // Final check for the last streak
  return Math.max(maxStreak, currentStreak);
};
