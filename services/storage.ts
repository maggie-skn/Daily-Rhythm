
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

export const calculateFlow = (logs: Record<string, DailyLog>): number => {
  // Logic: 3 days of missing data creates a break. Otherwise, it continues.
  // This is a "Flow" score, not a "Streak".
  const dates = Object.keys(logs).sort().reverse(); // Newest first
  if (dates.length === 0) return 0;

  let flowCount = 0;
  let gapCount = 0;
  const today = getTodayDateString();
  
  // Simple approximation for the demo
  let currentDate = new Date(today);
  
  // Look back 30 days maximum
  for (let i = 0; i < 30; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const log = logs[dateStr];

    // Check new array fields as well
    const hasActivity = log && (
      log.waterClicks > 0 || 
      log.exerciseStarted || 
      (log.exercises && log.exercises.length > 0) ||
      (log.hygieneLogs && log.hygieneLogs.length > 0) ||
      log.sleepTime || 
      log.isAnimalMode
    );

    if (hasActivity) {
      flowCount++;
      gapCount = 0; // Reset gap
    } else {
      gapCount++;
    }

    if (gapCount >= 3) {
      break; // Flow broken after 3 days of silence
    }

    // Go back one day
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return flowCount;
};
