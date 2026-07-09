export interface Student {
  id: string;
  name: string;
  initials: string;
  totalCoins: number;
  currentStreak: number;
  dailyGoal: number;
  joinedAt: string; // ISO 8601
}

export type SessionType = 'deep_focus' | 'quick_sprint' | 'pomodoro';
export type SessionStatus = 'completed' | 'abandoned';

export interface Session {
  id: string;
  studentId: string;
  type: SessionType;
  durationMs: number;
  coins: number;  
  status: SessionStatus;
  startedAt: number; // epoch milliseconds (list endpoint)
  completedAt: number | null;
}

export interface SessionDetail {
  id: string;
  studentId: string;
  type: SessionType;
  durationMs: number;
  coins: number;
  status: SessionStatus;
  startedAt: string; // ISO 8601 (detail endpoint - intentionally different from list)
  completedAt: string | null;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  type: 'focus' | 'break';
  durationMs: number;
  startedAt: string; // ISO 8601
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null; // ISO 8601 or null if locked
  progress: number; // 0-100
  target: number;
  current: number;
}

export interface WeeklyStats {
  totalSessions: number;
  totalCoins: number;
  streak: number;
  todayCompleted: number;
  dailyGoal: number;
  sessionsPerDay: DayStat[];
}

export interface DayStat {
  day: string; // lowercase abbreviated: "mon", "tue", "wed", "thu", "fri", "sat", "sun"
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null; // opaque base64 cursor, null if no more pages
  hasMore: boolean;
}
