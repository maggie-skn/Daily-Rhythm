
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { 
  DailyLog, 
  DEFAULT_LOG,
  ExerciseLog
} from './types';
import { 
  APP_CONFIG, 
  UI_TEXT, 
  FEEDBACK_MESSAGES, 
  getRandomFeedback 
} from './constants';
import { 
  getTodayDateString, 
  loadLogs, 
  saveLogs, 
  getLogForDate, 
  calculateFlow,
  calculateTotalDays
} from './services/storage';
import AnimalMode from './components/AnimalMode';
import { Icons } from './components/IconComponents';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';

// --- Helpers ---

// Generate time options for dropdown (19:00 to 07:00, every 10 minutes)
const TIME_OPTIONS = (() => {
    const options = [];
    // Hours sequence: 19, 20, ... 23, 00, ... 07
    const hours = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
    
    for (const h of hours) {
        for (let m = 0; m < 60; m += 10) {
            // Stop after 07:00
            if (h === 7 && m > 0) break;
            
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            options.push(time);
        }
    }
    return options;
})();

const getLocalYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalYMD(date);
};

const formatDisplayDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const dayName = days[date.getDay()];
    return `${m}月${d}日 ${dayName}`;
};

// --- Components ---

const ExerciseModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialMinutes = 10,
  initialType = 'stretch',
  dateLabel
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (type: 'active' | 'stretch', minutes: number) => void;
  initialMinutes?: number;
  initialType?: 'active' | 'stretch' | undefined;
  dateLabel?: string;
}) => {
  const [type, setType] = useState<'active' | 'stretch'>(initialType || 'stretch');
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    if (isOpen) {
        setMinutes(initialMinutes || 10);
        setType(initialType || 'stretch');
    }
  }, [isOpen, initialMinutes, initialType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-xl font-serif font-bold text-gentle-text">{UI_TEXT.exercise.modalTitle}</h3>
                {dateLabel && <p className="text-xs text-gentle-subtext mt-1">{dateLabel}</p>}
            </div>
            <button onClick={onClose} className="text-gentle-subtext hover:text-gentle-text">
                <Icons.Close size={24} />
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setType('active')}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    type === 'active' 
                    ? 'bg-gentle-accent text-white shadow-lg shadow-teal-900/10' 
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
            >
                <Icons.Active size={24} />
                <span className="font-medium">{UI_TEXT.exercise.typeActive}</span>
            </button>
            <button 
                onClick={() => setType('stretch')}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    type === 'stretch' 
                    ? 'bg-orange-400 text-white shadow-lg shadow-orange-900/10' 
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
            >
                <Icons.Stretch size={24} />
                <span className="font-medium">{UI_TEXT.exercise.typeStretch}</span>
            </button>
        </div>

        <div>
            <label className="block text-sm text-gentle-subtext mb-2 text-center">{UI_TEXT.exercise.minutesLabel}</label>
            <div className="flex items-center justify-center gap-4">
                <button 
                    onClick={() => setMinutes(m => Math.max(1, m - 5))}
                    className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xl"
                >
                    -
                </button>
                <span className="text-3xl font-light tabular-nums w-16 text-center text-gentle-text">
                    {minutes}
                </span>
                <button 
                    onClick={() => setMinutes(m => m + 5)}
                    className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xl"
                >
                    +
                </button>
            </div>
        </div>

        <button 
            onClick={() => onSave(type, minutes)}
            className="w-full py-4 bg-gentle-text text-white rounded-2xl font-medium active:scale-95 transition-transform"
        >
            {UI_TEXT.exercise.save}
        </button>

      </div>
    </div>
  );
};

// Generic Edit Log Modal for History
const EditLogModal = ({
    isOpen,
    onClose,
    date,
    metric,
    log,
    onUpdate
}: {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    metric: string;
    log: DailyLog;
    onUpdate: (updates: Partial<DailyLog>) => void;
}) => {
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    if (!isOpen) return null;

    const titleMap: Record<string, string> = {
        water: UI_TEXT.water.title,
        exercise: UI_TEXT.exercise.title,
        hygiene: UI_TEXT.shower.title,
        sleep: UI_TEXT.sleep.title
    };

    const handleExerciseSave = (type: 'active' | 'stretch', minutes: number) => {
        const newExercise: ExerciseLog = {
            id: Date.now().toString(),
            type,
            minutes,
            timestamp: new Date().toISOString()
        };
        const updatedExercises = [...(log.exercises || []), newExercise];
        onUpdate({ 
            exerciseStarted: true, 
            exercises: updatedExercises 
        });
        setShowExercisePicker(false);
    };

    const deleteExercise = (id: string) => {
        const updatedExercises = (log.exercises || []).filter(e => e.id !== id);
        onUpdate({ exercises: updatedExercises });
    };

    const toggleHygiene = (type: 'morning' | 'night') => {
        const current = log.hygieneLogs || [];
        const exists = current.some(h => h.type === type);
        let updated;
        if (exists) {
            updated = current.filter(h => h.type !== type);
        } else {
            updated = [...current, { id: Date.now().toString(), type, timestamp: new Date().toISOString() }];
        }
        onUpdate({ hygieneLogs: updated });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl slide-in-from-bottom-5 zoom-in-95 duration-300 relative">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-serif font-bold text-gentle-text">{titleMap[metric]}</h3>
                        <p className="text-sm text-gentle-subtext">{date}</p>
                    </div>
                    <button onClick={onClose} className="text-gentle-subtext hover:text-gentle-text">
                        <Icons.Close size={24} />
                    </button>
                </div>

                {/* Content based on Metric */}
                <div className="space-y-6">
                    
                    {/* WATER */}
                    {metric === 'water' && (
                        <div className="flex flex-col items-center">
                            <div className="text-5xl font-light text-sky-500 mb-2">
                                {log.waterClicks * APP_CONFIG.waterSipSize} <span className="text-base">ml</span>
                            </div>
                            <div className="flex items-center gap-6 mt-4">
                                <button 
                                    onClick={() => onUpdate({ waterClicks: Math.max(0, log.waterClicks - 1) })}
                                    className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xl hover:bg-stone-200"
                                >
                                    -
                                </button>
                                <span className="text-stone-400 text-sm">每次 {APP_CONFIG.waterSipSize}ml</span>
                                <button 
                                    onClick={() => onUpdate({ waterClicks: log.waterClicks + 1 })}
                                    className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xl hover:bg-sky-200"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {/* EXERCISE */}
                    {metric === 'exercise' && (
                        <div>
                             <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                {(log.exercises || []).length === 0 && <p className="text-center text-stone-400 py-4">無紀錄</p>}
                                {(log.exercises || []).map(ex => (
                                    <div key={ex.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${ex.type === 'active' ? 'bg-teal-100 text-gentle-accent' : 'bg-orange-100 text-orange-500'}`}>
                                                {ex.type === 'active' ? <Icons.Active size={16}/> : <Icons.Stretch size={16}/>}
                                            </div>
                                            <span className="text-stone-700 font-medium">
                                                {ex.type === 'active' ? UI_TEXT.exercise.typeActive : UI_TEXT.exercise.typeStretch}
                                                <span className="text-stone-400 ml-2 font-normal">{ex.minutes} min</span>
                                            </span>
                                        </div>
                                        <button onClick={() => deleteExercise(ex.id)} className="text-stone-300 hover:text-red-400 p-2">
                                            <Icons.Delete size={18} />
                                        </button>
                                    </div>
                                ))}
                             </div>
                             <button 
                                onClick={() => setShowExercisePicker(true)}
                                className="w-full py-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:bg-stone-50 flex items-center justify-center gap-2"
                             >
                                <Icons.Add size={18} /> 新增活動
                             </button>
                        </div>
                    )}

                    {/* HYGIENE */}
                    {metric === 'hygiene' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => toggleHygiene('morning')}
                                className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
                                    (log.hygieneLogs || []).some(h => h.type === 'morning')
                                    ? 'bg-orange-50 border-orange-200 text-orange-500' 
                                    : 'bg-white border-stone-100 text-stone-400 hover:bg-stone-50'
                                }`}
                            >
                                <Icons.Sun size={32} />
                                <span className="font-medium">晨間</span>
                            </button>
                            <button 
                                onClick={() => toggleHygiene('night')}
                                className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
                                    (log.hygieneLogs || []).some(h => h.type === 'night')
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-500' 
                                    : 'bg-white border-stone-100 text-stone-400 hover:bg-stone-50'
                                }`}
                            >
                                <Icons.Moon size={32} />
                                <span className="font-medium">晚間</span>
                            </button>
                        </div>
                    )}

                    {/* SLEEP */}
                    {metric === 'sleep' && (
                        <div className="space-y-4">
                             <div className="relative w-full">
                                <select 
                                    value={log.sleepTime || ""}
                                    onChange={(e) => onUpdate({ sleepTime: e.target.value })}
                                    className="w-full p-4 bg-stone-50 rounded-xl text-center text-xl font-medium text-stone-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">未記錄</option>
                                    {TIME_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-stone-400">
                                    <Icons.Clock size={20} />
                                </div>
                             </div>
                             {log.sleepTime && (
                                 <button 
                                    onClick={() => onUpdate({ sleepTime: null })}
                                    className="w-full py-2 text-stone-400 text-sm hover:text-red-400 transition-colors"
                                 >
                                     清除紀錄
                                 </button>
                             )}
                        </div>
                    )}
                </div>

                {/* Nested Modal for Exercise Picker */}
                {metric === 'exercise' && (
                    <ExerciseModal 
                        isOpen={showExercisePicker}
                        onClose={() => setShowExercisePicker(false)}
                        onSave={handleExerciseSave}
                        dateLabel={date}
                    />
                )}
            </div>
        </div>
    );
};


// --- Dashboard Component ---
const Dashboard = () => {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  // Use a display date state for navigation, initialized to today
  const [displayDate, setDisplayDate] = useState(getTodayDateString());
  const [currentLog, setCurrentLog] = useState<DailyLog>(DEFAULT_LOG);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAnimalMode, setShowAnimalMode] = useState(false);
  const [flowCount, setFlowCount] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  // Local state for UI interactions
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [pendingSleepTime, setPendingSleepTime] = useState("");

  const todayStr = getTodayDateString();
  const isToday = displayDate === todayStr;

  useEffect(() => {
    const loaded = loadLogs();
    setLogs(loaded);
    // Load log for the currently displayed date
    const log = getLogForDate(displayDate, loaded);
    setCurrentLog(log);
    setFlowCount(calculateFlow(loaded));
    setTotalDays(calculateTotalDays(loaded));
    setPendingSleepTime(log.sleepTime || "");
  }, [displayDate]);

  const updateLog = (updates: Partial<DailyLog>) => {
    // Update log for the displayed date
    const newLog = { ...currentLog, ...updates, date: displayDate };
    const newLogs = { ...logs, [displayDate]: newLog };
    setLogs(newLogs);
    setCurrentLog(newLog);
    saveLogs(newLogs);
    setFlowCount(calculateFlow(newLogs));
    setTotalDays(calculateTotalDays(newLogs));
  };

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // --- Handlers ---

  const handleAnimalModeToggle = () => {
    setShowAnimalMode(true);
  };

  const handlePrevDay = () => {
      setDisplayDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
      setDisplayDate(prev => addDays(prev, 1));
  };

  const handleWater = () => {
    updateLog({ waterClicks: currentLog.waterClicks + 1 });
    showToast(getRandomFeedback('water'));
  };

  const saveExercise = (type: 'active' | 'stretch', minutes: number) => {
      // Append new exercise log
      const newExercise: ExerciseLog = {
          id: Date.now().toString(),
          type,
          minutes,
          timestamp: new Date().toISOString()
      };
      
      const updatedExercises = [...(currentLog.exercises || []), newExercise];
      
      updateLog({
          exerciseStarted: true, // keep legacy field for safety
          exercises: updatedExercises
      });
      setShowExerciseModal(false);
      showToast(getRandomFeedback('exercise'));
  };

  const confirmSleep = () => {
    if (!pendingSleepTime) return;
    
    updateLog({ sleepTime: pendingSleepTime });
    
    const hour = parseInt(pendingSleepTime.split(':')[0]);
    if (hour >= 0 && hour < 4) {
      showToast(FEEDBACK_MESSAGES.lateNight);
    } else if (pendingSleepTime >= APP_CONFIG.targetSleepStart && pendingSleepTime <= APP_CONFIG.targetSleepEnd) {
      showToast(FEEDBACK_MESSAGES.sleep.perfect);
    } else {
      showToast(FEEDBACK_MESSAGES.sleep.late);
    }
  };

  const handleShower = (type: 'night' | 'morning') => {
    // Append new hygiene log
    const newLog = {
        id: Date.now().toString(),
        type,
        timestamp: new Date().toISOString()
    };
    const updatedHygieneLogs = [...(currentLog.hygieneLogs || []), newLog];

    updateLog({ 
        hygieneLogs: updatedHygieneLogs,
        showerType: type // Update legacy field to latest
    });
    showToast("已記錄洗漱。");
  };

  const totalExerciseMinutes = (currentLog.exercises || []).reduce((acc, curr) => acc + curr.minutes, 0);
  const lastExercise = currentLog.exercises?.[currentLog.exercises.length - 1];
  const lastHygiene = currentLog.hygieneLogs?.[currentLog.hygieneLogs.length - 1];

  // Logic for background colors based on LAST record
  const getExerciseBg = () => {
      if (!lastExercise) return 'bg-white';
      return lastExercise.type === 'active' ? 'bg-gentle-soft' : 'bg-orange-50'; // Teal vs Orange
  };

  const getExerciseIconColor = () => {
      if (!lastExercise) return 'bg-stone-100 text-stone-400';
      return lastExercise.type === 'active' ? 'bg-teal-100 text-gentle-accent' : 'bg-orange-100 text-orange-500';
  };
  
  const getHygieneBg = () => {
      if (!lastHygiene) return 'bg-white';
      return lastHygiene.type === 'morning' ? 'bg-orange-50' : 'bg-indigo-50'; // Morning vs Night
  };

  const getHygieneIconColor = () => {
      if (!lastHygiene) return 'bg-white/50 text-stone-400';
      return lastHygiene.type === 'morning' ? 'bg-orange-100 text-orange-500' : 'bg-indigo-100 text-indigo-500';
  }

  const getSleepBg = () => {
      if (!currentLog.sleepTime) return 'bg-white';
      
      const [h, m] = currentLog.sleepTime.split(':').map(Number);
      
      // Violet (Normal/Early): 19:00 - 00:00 (inclusive)
      if (h >= 19 || (h === 0 && m === 0)) {
          return 'bg-violet-50';
      }
      
      // Purple (Late): 00:01 - 07:00
      return 'bg-purple-100';
  };

  if (showAnimalMode) {
    return (
      <AnimalMode 
        onReturn={() => setShowAnimalMode(false)}
      />
    );
  }

  return (
    <div className="pb-24 max-w-md mx-auto fade-in">
      {/* Exercise Modal */}
      <ExerciseModal 
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onSave={saveExercise}
        initialMinutes={10}
        initialType="stretch"
      />

      {/* Header */}
      <header className="px-6 py-6 space-y-4">
        {/* Top Row: Title + Animal Button */}
        <div className="flex justify-between items-center">
            <div>
                 <h1 className="text-2xl font-serif text-gentle-text font-bold">{UI_TEXT.header}</h1>
                 <p className="text-gentle-subtext text-sm mt-1">{UI_TEXT.subHeader} {totalDays} 天</p>
                 <div className="flex items-center gap-2 mt-2 text-gentle-accent text-xs font-medium bg-gentle-soft px-3 py-1 rounded-full w-fit">
                    <Icons.Rhythm size={14} />
                    <span>心流：{flowCount} 天</span>
                </div>
            </div>
            <button 
                onClick={handleAnimalModeToggle}
                className="p-3 rounded-2xl bg-white border border-gentle-border text-gentle-subtext hover:bg-stone-50 transition-colors"
            >
                <Icons.Animal size={24} />
            </button>
        </div>
      </header>

      {/* Main Grid: 2x2 Layout */}
      <div className="px-4 grid grid-cols-2 gap-3">
        
        {/* 1. Water Card */}
        <div className="bg-white p-4 rounded-[32px] shadow-sm border border-gentle-border/50 flex flex-col justify-between h-48 relative overflow-hidden transition-all duration-500">
             {/* Progress Background */}
            <div 
                className="absolute bottom-0 left-0 right-0 bg-sky-50 transition-all duration-700 ease-out z-0"
                style={{ height: `${Math.min((currentLog.waterClicks * APP_CONFIG.waterSipSize / 2000) * 100, 100)}%` }}
            />
            
            <div className="flex justify-between items-start z-10">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-500">
                    <Icons.Water size={20} />
                </div>
                <span className="text-3xl font-light text-sky-600">
                    {currentLog.waterClicks > 0 ? currentLog.waterClicks : ''}
                </span>
            </div>
            
            <div className="z-10 text-center mt-auto">
                <span className="text-sm text-gentle-text font-medium block mb-3">{UI_TEXT.water.title}</span>
                <button 
                    onClick={handleWater}
                    className="w-full py-3 rounded-xl bg-white border border-sky-100 text-sky-700 text-sm font-medium hover:bg-sky-50 transition-colors active:scale-95 shadow-sm"
                >
                    {UI_TEXT.water.action}
                </button>
            </div>
        </div>

        {/* 2. Exercise Card */}
        <div className={`${getExerciseBg()} p-4 rounded-[32px] shadow-sm border border-gentle-border/50 flex flex-col justify-between h-48 transition-colors duration-500`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl ${getExerciseIconColor()}`}>
                    {lastExercise?.type === 'active' ? <Icons.Active size={20} /> : (lastExercise?.type === 'stretch' ? <Icons.Stretch size={20} /> : <Icons.Exercise size={20} />)}
                </div>
                {totalExerciseMinutes > 0 && (
                    <span className={`text-3xl font-light animate-in fade-in slide-in-from-bottom-2 ${lastExercise?.type === 'active' ? 'text-gentle-accent' : 'text-orange-500'}`}>
                        {totalExerciseMinutes}
                        <span className="text-sm ml-1">m</span>
                    </span>
                )}
            </div>
            
            <div className="text-center mt-auto">
                <span className="text-sm text-gentle-text font-medium block mb-3">{UI_TEXT.exercise.title}</span>
                <button 
                    onClick={() => setShowExerciseModal(true)}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm ${
                        totalExerciseMinutes > 0
                        ? 'bg-white/80 backdrop-blur text-stone-700 border border-stone-100 hover:bg-white' 
                        : 'bg-stone-800 text-white hover:bg-stone-900'
                    }`}
                >
                    {totalExerciseMinutes > 0 ? "再次記錄" : UI_TEXT.exercise.action}
                </button>
            </div>
        </div>

        {/* 3. Hygiene Card */}
        <div className={`${getHygieneBg()} p-4 rounded-[32px] shadow-sm border border-gentle-border/50 flex flex-col justify-between h-48 transition-colors duration-500`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl transition-colors ${getHygieneIconColor()}`}>
                    <Icons.Shower size={20} />
                </div>
            </div>
            
            <div className="text-center mt-auto">
                <span className="text-sm text-gentle-text font-medium block mb-3">{UI_TEXT.shower.title}</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleShower('morning')}
                        className="flex-1 py-3 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-100 active:scale-95 flex justify-center items-center transition-colors shadow-sm border border-orange-100"
                    >
                        <Icons.Sun size={20} />
                    </button>
                    <button 
                        onClick={() => handleShower('night')}
                        className="flex-1 py-3 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 active:scale-95 flex justify-center items-center transition-colors shadow-sm border border-indigo-100"
                    >
                        <Icons.Moon size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* 4. Sleep Card */}
        <div className={`${getSleepBg()} p-4 rounded-[32px] shadow-sm border border-gentle-border/50 flex flex-col justify-between h-48 transition-colors duration-500`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-xl transition-colors ${currentLog.sleepTime ? 'bg-white/50 text-indigo-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    <Icons.Clock size={20} />
                </div>
            </div>
            
            <div className="flex flex-col justify-end h-full relative z-10 w-full">
                {/* Title */}
                <span className="text-sm text-gentle-text font-medium text-center mb-1 absolute top-0 left-0 right-0">{UI_TEXT.sleep.title}</span>

                {/* Middle: Time Display / Dropdown */}
                <div className="flex-1 flex items-center justify-center pb-2">
                     <div className="relative group w-full">
                        <select 
                            value={pendingSleepTime}
                            onChange={(e) => setPendingSleepTime(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer appearance-none text-center"
                        >
                            <option value="" disabled>--:--</option>
                            {TIME_OPTIONS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className={`text-center text-3xl font-light transition-colors flex items-center justify-center ${pendingSleepTime ? 'text-indigo-600' : 'text-stone-300'}`}>
                            {pendingSleepTime || '--:--'}
                        </div>
                     </div>
                </div>
                
                {/* Bottom: Action Button */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        confirmSleep();
                    }}
                    disabled={!pendingSleepTime || pendingSleepTime === currentLog.sleepTime}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95 shadow-sm z-30 ${
                        pendingSleepTime && pendingSleepTime !== currentLog.sleepTime
                        ? 'bg-indigo-500 text-white shadow-indigo-200' 
                        : (currentLog.sleepTime ? 'bg-white/50 text-indigo-400 border border-indigo-100' : 'bg-stone-100 text-stone-300 cursor-not-allowed')
                    }`}
                >
                    {currentLog.sleepTime && pendingSleepTime === currentLog.sleepTime ? "已記錄" : UI_TEXT.sleep.confirm}
                </button>
            </div>
        </div>

      </div>

      {/* Date Navigation - Moved to bottom */}
      <div className="flex items-center justify-center gap-6 py-8">
            <button 
                onClick={handlePrevDay} 
                className="p-4 rounded-full bg-white shadow-sm border border-gentle-border text-stone-500 hover:bg-stone-50 transition-transform active:scale-95"
            >
                <Icons.Back size={24} />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
                <span className="text-xl font-serif text-gentle-text font-medium">
                    {formatDisplayDate(displayDate)}
                </span>
                {isToday && <span className="text-xs text-gentle-accent font-medium mt-1">今天</span>}
            </div>
            <button 
                onClick={handleNextDay} 
                disabled={isToday}
                className={`p-4 rounded-full bg-white shadow-sm border border-gentle-border transition-transform active:scale-95 ${isToday ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-50 text-stone-500'}`}
            >
                <Icons.Next size={24} />
            </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-stone-800 text-stone-50 px-6 py-3 rounded-full shadow-xl text-sm fade-in z-40 whitespace-nowrap">
          {feedback}
        </div>
      )}
    </div>
  );
};


// --- History Overview (Calendar Grid View) ---

const checkMetric = (log: DailyLog, type: string) => {
    switch(type) {
        case 'water': return log.waterClicks > 0;
        case 'exercise': return (log.exercises?.length || 0) > 0;
        case 'hygiene': return (log.hygieneLogs?.length || 0) > 0;
        case 'sleep': return !!log.sleepTime;
        default: return false;
    }
}

// Logic to determine color for Sleep cells
const getSleepColor = (log: DailyLog) => {
    if (!log.sleepTime) return null;
    const [h, m] = log.sleepTime.split(':').map(Number);
    
    // Logic: 
    // 19:00 - 00:00 -> Violet
    // > 00:00 (e.g., 00:10, 01:00...) -> Purple
    
    if (h >= 19 || (h === 0 && m === 0)) {
        return 'bg-violet-300'; // Visible violet for grid
    }
    
    return 'bg-purple-100'; // Softer purple for late sleep
}

// Logic to determine color for Water cells
const getWaterColor = (log: DailyLog) => {
    if (log.waterClicks <= 0) return null;
    const volume = log.waterClicks * APP_CONFIG.waterSipSize;
    if (volume >= 2000) {
        return 'bg-blue-500'; // Stronger blue for target reached
    }
    return 'bg-sky-400'; // Standard blue for below target
}

// Logic to determine color for Exercise cells
const getExerciseColor = (log: DailyLog) => {
    if (!log.exercises || log.exercises.length === 0) return null;
    
    // Check for mixed types
    const hasActive = log.exercises.some(e => e.type === 'active');
    const hasStretch = log.exercises.some(e => e.type === 'stretch');

    if (hasActive && hasStretch) {
        return 'bg-lime-400'; // Mixed type: Yellowish Green
    }

    const last = log.exercises[log.exercises.length - 1];
    // Active -> Lighter Blue-Green (Teal 300), Stretch -> Orange
    return last.type === 'active' ? 'bg-teal-300' : 'bg-orange-400';
}

// Logic to determine color for Hygiene cells
const getHygieneColor = (log: DailyLog) => {
    if (!log.hygieneLogs || log.hygieneLogs.length === 0) return null;
    const last = log.hygieneLogs[log.hygieneLogs.length - 1];
    // Morning -> Orange, Night -> Indigo
    return last.type === 'morning' ? 'bg-orange-300' : 'bg-indigo-400';
}

const MonthGrid = ({ 
    year, 
    month, 
    logs, 
    metric, 
    getColor,
    onDayClick,
    emptyClass = "bg-stone-100" 
}: { 
    year: number, 
    month: number, 
    logs: Record<string, DailyLog>, 
    metric: string, 
    getColor: (log: DailyLog) => string | null, 
    onDayClick: (date: string) => void,
    emptyClass?: string 
}) => {
    const days = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); 
        
        const slots: ({ date: string, color: string | null } | null)[] = [];
        
        for (let i = 0; i < startDayOfWeek; i++) {
            slots.push(null);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dateStr = getLocalYMD(d);
            
            const log = getLogForDate(dateStr, logs);
            const color = getColor(log);
            
            slots.push({ date: dateStr, color });
        }
        return slots;
    }, [year, month, logs, metric, getColor]);

    return (
        <div className="mb-0">
            <div className="grid grid-cols-7 gap-1">
                {days.map((slot, idx) => {
                    if (!slot) return <div key={`empty-${idx}`} className="w-full aspect-square"></div>;
                    return (
                        <div 
                            key={slot.date}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDayClick(slot.date);
                            }}
                            className={`w-full aspect-square rounded-[2px] transition-colors cursor-pointer hover:opacity-80 active:scale-90 ${slot.color || emptyClass}`}
                            title={slot.date}
                        ></div>
                    );
                })}
            </div>
        </div>
    );
};

const CalendarView = ({ 
    year,
    month,
    metric, 
    logs,
    defaultColor,
    onDayClick
}: { 
    year: number,
    month: number,
    metric: string, 
    logs: Record<string, DailyLog>,
    defaultColor: string,
    onDayClick: (date: string) => void
}) => {
    const getColor = (log: DailyLog) => {
        if (metric === 'sleep') {
            return getSleepColor(log);
        }
        if (metric === 'water') {
            return getWaterColor(log);
        }
        if (metric === 'exercise') {
            return getExerciseColor(log);
        }
        if (metric === 'hygiene') {
            return getHygieneColor(log);
        }
        // Default behavior for other metrics (fallback)
        return checkMetric(log, metric) ? defaultColor : null;
    }
    
    return (
        <div>
            <MonthGrid 
                year={year} 
                month={month} 
                logs={logs} 
                metric={metric} 
                getColor={getColor}
                onDayClick={onDayClick}
            />
        </div>
    );
};

const HistoryOverview = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<Record<string, DailyLog>>({});
    const [todayStatus, setTodayStatus] = useState({ water: false, exercise: false, sleep: false, hygiene: false });
    
    // Date Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Edit Modal State
    const [editingTarget, setEditingTarget] = useState<{date: string, metric: string} | null>(null);

    useEffect(() => {
        const loaded = loadLogs();
        setLogs(loaded);
        const todayStr = getTodayDateString();
        const todayLog = getLogForDate(todayStr, loaded);
        setTodayStatus({
            water: checkMetric(todayLog, 'water'),
            exercise: checkMetric(todayLog, 'exercise'),
            sleep: checkMetric(todayLog, 'sleep'),
            hygiene: checkMetric(todayLog, 'hygiene')
        });
    }, []);

    const handleUpdateLog = (updates: Partial<DailyLog>) => {
        if (!editingTarget) return;
        
        const date = editingTarget.date;
        const currentLog = getLogForDate(date, logs);
        
        const newLog = { ...currentLog, ...updates, date };
        const newLogs = { ...logs, [date]: newLog };
        
        setLogs(newLogs);
        saveLogs(newLogs);
        
        // Update today status if we edited today
        if (date === getTodayDateString()) {
            setTodayStatus({
                water: checkMetric(newLog, 'water'),
                exercise: checkMetric(newLog, 'exercise'),
                sleep: checkMetric(newLog, 'sleep'),
                hygiene: checkMetric(newLog, 'hygiene')
            });
        }
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const cards = [
        { 
            id: 'water',
            title: UI_TEXT.water.title, 
            icon: Icons.Water, 
            done: todayStatus.water,
            color: 'bg-sky-400',
            iconColor: 'text-sky-500',
            bgColor: 'bg-sky-50'
        },
        { 
            id: 'exercise',
            title: UI_TEXT.exercise.title, 
            icon: Icons.Exercise, 
            done: todayStatus.exercise,
            color: 'bg-gentle-accent',
            iconColor: 'text-gentle-accent',
            bgColor: 'bg-gentle-soft'
        },
        { 
            id: 'hygiene',
            title: UI_TEXT.shower.title, 
            icon: Icons.Shower, 
            done: todayStatus.hygiene,
            color: 'bg-teal-400',
            iconColor: 'text-teal-600',
            bgColor: 'bg-teal-50'
        },
        { 
            id: 'sleep',
            title: UI_TEXT.sleep.title, 
            icon: Icons.Sleep, 
            done: todayStatus.sleep,
            color: 'bg-indigo-400', // Default color (will be overridden by logic for sleep)
            iconColor: 'text-indigo-500',
            bgColor: 'bg-indigo-50'
        },
    ];

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    return (
        <div className="pb-24 max-w-md mx-auto px-6 py-8 fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-serif text-gentle-text font-bold">歷史回顧</h1>
             </div>
             
             {/* Month Navigation */}
             <div className="flex items-center justify-center gap-6 mb-6">
                 <button onClick={handlePrevMonth} className="p-2 text-stone-400 hover:text-gentle-text rounded-full hover:bg-stone-100">
                     <Icons.Back size={20} />
                 </button>
                 <span className="text-lg font-serif font-medium text-gentle-text tabular-nums">
                     {currentYear} - {String(currentMonth + 1).padStart(2, '0')}
                 </span>
                 <button onClick={handleNextMonth} className="p-2 text-stone-400 hover:text-gentle-text rounded-full hover:bg-stone-100">
                     <Icons.Next size={20} />
                 </button>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                {cards.map(card => (
                    <div 
                        key={card.id} 
                        onClick={() => navigate(`/history/${card.id}`)}
                        className="bg-white p-4 rounded-3xl shadow-sm border border-gentle-border/50 active:scale-[0.99] transition-transform cursor-pointer h-auto flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl ${card.bgColor} ${card.iconColor}`}>
                                    <card.icon size={20} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-2">
                             <span className="font-medium text-gentle-text text-sm">{card.title}</span>
                        </div>
                        
                        <div className="px-0">
                             <CalendarView 
                                year={currentYear}
                                month={currentMonth}
                                metric={card.id} 
                                logs={logs} 
                                defaultColor={card.color}
                                onDayClick={(date) => setEditingTarget({ date, metric: card.id })} 
                             />
                        </div>
                    </div>
                ))}
             </div>

             {/* Editing Modal */}
             {editingTarget && (
                 <EditLogModal 
                    isOpen={!!editingTarget}
                    onClose={() => setEditingTarget(null)}
                    date={editingTarget.date}
                    metric={editingTarget.metric}
                    log={getLogForDate(editingTarget.date, logs)}
                    onUpdate={handleUpdateLog}
                 />
             )}
        </div>
    );
};

// --- History Detail (Charts) ---
const HistoryDetail = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const [range, setRange] = useState<'week' | 'month'>('month');
    const [offset, setOffset] = useState(0); // Offset in weeks or months
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const logs = loadLogs();
        const today = new Date();
        const dates = [];
        
        if (range === 'week') {
            // Start of week (Sunday) based on offset
            const startOfWeek = new Date(today);
            const dayOfWeek = startOfWeek.getDay(); 
            // Calculate base date: Today - DayOfWeek (gets Sunday) + (Offset * 7 days)
            startOfWeek.setDate(today.getDate() - dayOfWeek + (offset * 7));
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                dates.push(getLocalYMD(d));
            }
        } else {
            // Month View based on offset
            // Current month + offset
            const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                dates.push(getLocalYMD(d));
            }
        }
        
        const chartData = dates.map(date => {
            const log = getLogForDate(date, logs);
            
            const activeMins = (log.exercises || []).filter(e => e.type === 'active').reduce((a, b) => a + b.minutes, 0);
            const stretchMins = (log.exercises || []).filter(e => e.type === 'stretch').reduce((a, b) => a + b.minutes, 0);
            const waterVolume = (log.waterClicks || 0) * APP_CONFIG.waterSipSize;
            const hasMorning = (log.hygieneLogs || []).some(h => h.type === 'morning') ? 1 : 0;
            const hasNight = (log.hygieneLogs || []).some(h => h.type === 'night') ? 1 : 0;
            
            // Sleep Time Formatting
            let sleepTimeVal = null;
            let formattedTime = "";
            if (log.sleepTime) {
                const [h, m] = log.sleepTime.split(':').map(Number);
                formattedTime = log.sleepTime;
                // Convert to "Hours past 20:00" for visualization
                let hourOffset = h;
                if (h < 12) hourOffset += 24; 
                sleepTimeVal = hourOffset + (m / 60);
            }

            return {
                name: date.slice(5),
                fullDate: date,
                waterVolume,
                activeMins,
                stretchMins,
                hasMorning,
                hasNight,
                sleepTimeVal,
                formattedTime
            };
        });
        setData(chartData);
    }, [range, type, offset]);

    const formatTimeTick = (val: number) => {
        let h = Math.floor(val);
        const m = Math.round((val - h) * 60);
        if (h >= 24) h -= 24;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const renderChart = () => {
        switch(type) {
            case 'water':
                return (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="name" tick={{fill: '#A8A29E', fontSize: 9}} interval={range === 'week' ? 0 : 3} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#A8A29E', fontSize: 9}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#F5F5F4'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="waterVolume" fill="#7DD3FC" radius={[4, 4, 0, 0]} name="水量 (ml)" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'exercise':
                return (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="name" tick={{fill: '#A8A29E', fontSize: 9}} interval={range === 'week' ? 0 : 3} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#A8A29E', fontSize: 9}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#F5F5F4'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}}/>
                            <Bar dataKey="activeMins" stackId="a" fill="#0D9488" radius={[0, 0, 2, 2]} name="運動" />
                            <Bar dataKey="stretchMins" stackId="a" fill="#FB923C" radius={[2, 2, 0, 0]} name="伸展" />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'hygiene':
                return (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="name" tick={{fill: '#A8A29E', fontSize: 9}} interval={range === 'week' ? 0 : 3} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 2]} />
                            <Tooltip cursor={{fill: '#F5F5F4'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}}/>
                            <Bar dataKey="hasMorning" stackId="a" fill="#FDBA74" name="晨間" radius={[0, 0, 2, 2]} />
                            <Bar dataKey="hasNight" stackId="a" fill="#818CF8" name="晚間" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'sleep':
                return (
                    <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="name" tick={{fill: '#A8A29E', fontSize: 9}} interval={range === 'week' ? 0 : 3} axisLine={false} tickLine={false} />
                            <YAxis 
                                dataKey="sleepTimeVal" 
                                domain={[20, 29]} // 8 PM to 5 AM (next day)
                                tickFormatter={formatTimeTick}
                                tick={{fill: '#A8A29E', fontSize: 9}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                cursor={{strokeDasharray: '3 3'}} 
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-2 rounded-xl shadow-md border border-stone-100 text-xs text-gentle-text">
                                                <p className="font-bold mb-1">{payload[0].payload.fullDate}</p>
                                                <p>入睡時間: {payload[0].payload.formattedTime || '未記錄'}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Scatter name="入睡" dataKey="sleepTimeVal" fill="#818CF8" shape="circle" />
                        </ScatterChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch(type) {
            case 'water': return UI_TEXT.water.title;
            case 'exercise': return UI_TEXT.exercise.title;
            case 'hygiene': return UI_TEXT.shower.title;
            case 'sleep': return UI_TEXT.sleep.title;
            default: return '詳細資料';
        }
    };
    
    // Calculate display label for date range
    const getDateRangeLabel = () => {
        const today = new Date();
        if (range === 'week') {
            const startOfWeek = new Date(today);
            const dayOfWeek = startOfWeek.getDay(); 
            startOfWeek.setDate(today.getDate() - dayOfWeek + (offset * 7));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return `${startOfWeek.getMonth()+1}/${startOfWeek.getDate()} - ${endOfWeek.getMonth()+1}/${endOfWeek.getDate()}`;
        } else {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            return `${targetDate.getFullYear()} - ${targetDate.getMonth() + 1}`;
        }
    };

    return (
        <div className="pb-24 max-w-md mx-auto px-6 py-8 fade-in">
            <button onClick={() => navigate('/history')} className="mb-6 flex items-center text-gentle-subtext hover:text-gentle-text">
                <Icons.Back className="mr-1" size={20} /> 返回
            </button>
            
            <div className="flex justify-between items-end mb-6">
                <div>
                     <h1 className="text-2xl font-serif text-gentle-text font-bold mb-2">{getTitle()}</h1>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setOffset(o => o - 1)} className="p-1 rounded-full hover:bg-stone-100 text-stone-400">
                             <Icons.Back size={16} />
                        </button>
                        <span className="text-sm font-medium text-gentle-text tabular-nums">{getDateRangeLabel()}</span>
                        <button onClick={() => setOffset(o => o + 1)} className="p-1 rounded-full hover:bg-stone-100 text-stone-400">
                             <Icons.Next size={16} />
                        </button>
                     </div>
                </div>
                
                <div className="bg-stone-100 p-1 rounded-xl flex">
                    <button 
                        onClick={() => { setRange('week'); setOffset(0); }}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${range === 'week' ? 'bg-white shadow-sm text-gentle-text font-medium' : 'text-stone-400'}`}
                    >
                        週
                    </button>
                    <button 
                        onClick={() => { setRange('month'); setOffset(0); }}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${range === 'month' ? 'bg-white shadow-sm text-gentle-text font-medium' : 'text-stone-400'}`}
                    >
                        月
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gentle-border/50">
                {renderChart()}
            </div>
            
            <div className="mt-8 text-center text-gentle-subtext text-sm">
                <p>每一次紀錄都是對自己的溫柔。</p>
            </div>
        </div>
    );
};


const App = () => {
  return (
    <HashRouter>
            <div className="min-h-screen bg-gentle-bg text-gentle-text font-sans">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/history" element={<HistoryOverview />} />
                    <Route path="/history/:type" element={<HistoryDetail />} />
                </Routes>

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gentle-border pb-safe z-30">
                    <div className="max-w-md mx-auto flex justify-around p-4">
                        <Link to="/" className="flex flex-col items-center text-gentle-subtext hover:text-gentle-accent active:text-gentle-accent transition-colors">
                            <Icons.Home size={24} />
                        </Link>
                        <Link to="/history" className="flex flex-col items-center text-gentle-subtext hover:text-gentle-accent active:text-gentle-accent transition-colors">
                            <Icons.Stats size={24} />
                        </Link>
                    </div>
                </nav>
            </div>
    </HashRouter>
  );
};

export default App;
