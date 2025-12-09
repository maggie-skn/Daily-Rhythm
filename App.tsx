
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
  calculateFlow 
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

// --- Components ---

const ExerciseModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialMinutes = 10,
  initialType = 'stretch'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (type: 'active' | 'stretch', minutes: number) => void;
  initialMinutes?: number;
  initialType?: 'active' | 'stretch' | undefined;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif font-bold text-gentle-text">{UI_TEXT.exercise.modalTitle}</h3>
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


// --- Dashboard Component ---
const Dashboard = () => {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [todayDate] = useState(getTodayDateString());
  const [currentLog, setCurrentLog] = useState<DailyLog>(DEFAULT_LOG);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAnimalMode, setShowAnimalMode] = useState(false);
  const [flowCount, setFlowCount] = useState(0);

  // Local state for UI interactions
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [pendingSleepTime, setPendingSleepTime] = useState("");

  useEffect(() => {
    const loaded = loadLogs();
    setLogs(loaded);
    const today = getLogForDate(todayDate, loaded);
    setCurrentLog(today);
    setFlowCount(calculateFlow(loaded));
    setPendingSleepTime(today.sleepTime || "");
  }, [todayDate]);

  const updateLog = (updates: Partial<DailyLog>) => {
    const newLog = { ...currentLog, ...updates, date: todayDate };
    const newLogs = { ...logs, [todayDate]: newLog };
    setLogs(newLogs);
    setCurrentLog(newLog);
    saveLogs(newLogs);
    setFlowCount(calculateFlow(newLogs));
  };

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // --- Handlers ---

  const handleAnimalModeToggle = () => {
    setShowAnimalMode(true);
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
      <header className="px-6 py-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-serif text-gentle-text font-bold">{UI_TEXT.header}</h1>
          <p className="text-gentle-subtext text-sm mt-1">{UI_TEXT.subHeader}</p>
          <div className="flex items-center gap-2 mt-2 text-gentle-accent text-xs font-medium bg-gentle-soft px-3 py-1 rounded-full w-fit">
            <Icons.Rhythm size={14} />
            <span>心流：{flowCount} 天</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={handleAnimalModeToggle}
            className="p-3 rounded-2xl transition-all duration-300 bg-white border border-gentle-border text-gentle-subtext hover:bg-stone-50"
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
    
    return 'bg-purple-400'; // Visible purple for grid
}

const MonthGrid = ({ 
    year, 
    month, 
    logs, 
    metric, 
    getColor,
    emptyClass = "bg-stone-100" 
}: { 
    year: number, 
    month: number, 
    logs: Record<string, DailyLog>, 
    metric: string, 
    getColor: (log: DailyLog) => string | null, 
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
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;
            
            const log = getLogForDate(dateStr, logs);
            const color = getColor(log);
            
            slots.push({ date: dateStr, color });
        }
        return slots;
    }, [year, month, logs, metric, getColor]);

    return (
        <div className="mb-0">
            <div className="text-center text-xs text-stone-400 mb-2 font-serif">
                {year} - {month + 1}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((slot, idx) => {
                    if (!slot) return <div key={`empty-${idx}`} className="w-full aspect-square"></div>;
                    return (
                        <div 
                            key={slot.date}
                            className={`w-full aspect-square rounded-[2px] transition-colors ${slot.color || emptyClass}`}
                            title={slot.date}
                        ></div>
                    );
                })}
            </div>
        </div>
    );
};

const CalendarView = ({ 
    metric, 
    logs,
    defaultColor
}: { 
    metric: string, 
    logs: Record<string, DailyLog>,
    defaultColor: string
}) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const getColor = (log: DailyLog) => {
        if (metric === 'sleep') {
            return getSleepColor(log);
        }
        // Default behavior for other metrics
        return checkMetric(log, metric) ? defaultColor : null;
    }
    
    return (
        <div>
            <MonthGrid 
                year={currentYear} 
                month={currentMonth} 
                logs={logs} 
                metric={metric} 
                getColor={getColor}
            />
        </div>
    );
};

const HistoryOverview = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<Record<string, DailyLog>>({});
    const [todayStatus, setTodayStatus] = useState({ water: false, exercise: false, sleep: false, hygiene: false });

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

    return (
        <div className="pb-24 max-w-md mx-auto px-6 py-8 fade-in">
             <h1 className="text-2xl font-serif text-gentle-text mb-6 font-bold">歷史回顧</h1>
             
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
                            {card.done && (
                                <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                            )}
                        </div>
                        
                        <div className="mb-2">
                             <span className="font-medium text-gentle-text text-sm">{card.title}</span>
                        </div>
                        
                        <div className="px-0">
                             <CalendarView 
                                metric={card.id} 
                                logs={logs} 
                                defaultColor={card.color} 
                             />
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

// --- History Detail (Charts) ---
const HistoryDetail = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const [range, setRange] = useState<'week' | 'month'>('month');
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const logs = loadLogs();
        const today = new Date();
        const dates = [];

        if (range === 'week') {
            // Start of week (Sunday)
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay(); // 0 is Sunday
            startOfWeek.setDate(today.getDate() - day);
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                dates.push(d.toISOString().split('T')[0]);
            }
        } else {
            // Start of month
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                dates.push(d.toISOString().split('T')[0]);
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
                // 20:00 = 0
                // 22:00 = 2
                // 00:00 = 4 (24)
                // 02:00 = 6 (26)
                let hourOffset = h;
                if (h < 12) hourOffset += 24; // Handle next day hours
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
    }, [range, type]);

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

    return (
        <div className="pb-24 max-w-md mx-auto px-6 py-8 fade-in">
            <button onClick={() => navigate('/history')} className="mb-6 flex items-center text-gentle-subtext hover:text-gentle-text">
                <Icons.Back className="mr-1" size={20} /> 返回
            </button>
            
            <div className="flex justify-between items-end mb-6">
                <h1 className="text-2xl font-serif text-gentle-text font-bold">{getTitle()}</h1>
                <div className="bg-stone-100 p-1 rounded-xl flex">
                    <button 
                        onClick={() => setRange('week')}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${range === 'week' ? 'bg-white shadow-sm text-gentle-text font-medium' : 'text-stone-400'}`}
                    >
                        7天
                    </button>
                    <button 
                        onClick={() => setRange('month')}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${range === 'month' ? 'bg-white shadow-sm text-gentle-text font-medium' : 'text-stone-400'}`}
                    >
                        30天
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


// --- Main App & Navigation ---
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