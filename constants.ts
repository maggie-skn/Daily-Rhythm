

export const APP_CONFIG = {
  waterSipSize: 350, // ml
  targetSleepStart: "22:30",
  targetSleepEnd: "23:30",
};

export const UI_TEXT = {
  header: "日常節律",
  subHeader: "系統維護",
  restMode: "休息模式",
  noData: "", // Empty as requested
  animalModeLabel: "認知休眠模式",
  animalModeActive: "系統休息中。明天見。",
  animalButton: "回來了",
  animalExit: "暫時休息",
  
  // Trackers
  water: {
    title: "水分補給",
    action: "喝一口水",
    unit: "水位",
  },
  exercise: {
    title: "身體活動",
    action: "動一動手腳", 
    completed: "已記錄活動",
    modalTitle: "選擇活動形式",
    typeActive: "運動",
    typeStretch: "伸展",
    minutesLabel: "時間 (分鐘)",
    save: "記錄",
    cancel: "取消",
  },
  sleep: {
    title: "關機時間",
    action: "記錄睡眠",
    placeholder: "選擇時間...",
    confirm: "確定",
  },
  shower: {
    title: "洗漱",
    subtitle: "刷個牙、擦擦臉",
    optNight: "晚間洗漱",
    optMorning: "晨間梳洗",
    optNone: "跳過 (節省能量)",
  }
};

export const FEEDBACK_MESSAGES = {
  water: [
    "維護了身體的水位。",
    "系統水分補充完畢。",
    "流動順暢。",
    "生命力已補給。"
  ],
  exercise: [
    "微啟動執行成功。",
    "循環已激活。",
    "感謝你的活動。",
    "已確認身體狀態。"
  ],
  sleep: {
    perfect: "與自然節律完美同步。",
    late: "已記錄。隨時歡迎休息。",
    early: "啟動提早關機。享受休息。"
  },
  general: [
    "系統啟動成功。",
    "節省了心力資源。",
    "溫柔的進展。",
    "你已經做得很好了。"
  ],
  lateNight: "現在是關機時間。允許自己切斷電源吧。",
  animalMode: "認知負載已降低。安全模式啟動。"
};

export const getRandomFeedback = (type: 'water' | 'exercise' | 'general'): string => {
  const list = FEEDBACK_MESSAGES[type] || FEEDBACK_MESSAGES.general;
  return list[Math.floor(Math.random() * list.length)];
};
