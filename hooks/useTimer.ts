import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { TimelineEntry } from '@/types/api';
import { API_BASE_URL } from '@/constants/Api';
import { haptic } from '@/constants/Haptics';

export type TimerType = 'deep_focus' | 'quick_sprint' | 'pomodoro';
export type TimerState = 'idle' | 'running' | 'paused' | 'saving' | 'completed';
export type PomodoroPhase = 'focus' | 'break';

const STUDENT_ID = 'stu_01';

// Shared timer mode configurations
export const TIMER_CONFIGS = {
  deep_focus: {
    focusMs: 25 * 60 * 1000, // 25 min
    breakMs: 0,
    label: 'Deep Focus',
    emoji: '🎯',
    color: Colors.primary,
    bgColor: Colors.primaryLight,
  },
  quick_sprint: {
    focusMs: 15 * 60 * 1000, // 15 min
    breakMs: 0,
    label: 'Quick Sprint',
    emoji: '⚡',
    color: Colors.amber,
    bgColor: Colors.amberLight,
  },
  pomodoro: {
    focusMs: 25 * 60 * 1000, // 25 min
    breakMs: 5 * 60 * 1000,  // 5 min
    label: 'Pomodoro',
    emoji: '🍅',
    color: Colors.error,
    bgColor: '#FEE2E2',
  },
};

export function useTimer() {
  const [timerType, setTimerType] = useState<TimerType>('deep_focus');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('focus');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalSecondsForPhase, setTotalSecondsForPhase] = useState<number>(0);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEntry[]>([]);
  
  const phaseStartTimeRef = useRef<number>(0);

  const [sessionResult, setSessionResult] = useState<{
    coins: number;
    streak: number;
    typeLabel: string;
    durationMin: number;
  } | null>(null);

  // POST the completed session to the database
  const saveSession = useCallback(async (events: TimelineEntry[]) => {
    setTimerState('saving');
    const totalDurationMs = events.reduce((sum, e) => sum + e.durationMs, 0);

    try {
      const response = await fetch(`${API_BASE_URL}/students/${STUDENT_ID}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: timerType,
          durationMs: totalDurationMs,
          timeline: events,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save focus session');
      }

      const result = await response.json();

      setSessionResult({
        coins: result.coins,
        streak: 0, // Fallback placeholder
        typeLabel: TIMER_CONFIGS[timerType].label,
        durationMin: Math.round(totalDurationMs / 60000),
      });

      // Re-fetch the updated streak by fetching profile
      try {
        const studentRes = await fetch(`${API_BASE_URL}/students/${STUDENT_ID}`);
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setSessionResult(prev =>
            prev ? { ...prev, streak: studentData.currentStreak } : null
          );
        }
      } catch (err) {
        console.error('Failed to update streak info:', err);
      }

      haptic.success();
      setTimerState('completed');
    } catch (err: any) {
      console.error(err);
      haptic.error();
      Alert.alert(
        'Connection Error',
        'We had trouble saving your focus session. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => saveSession(events) },
          { text: 'Cancel', onPress: () => setTimerState('idle'), style: 'cancel' },
        ]
      );
    }
  }, [timerType]);

  // Complete a segment of focus or break
  const handlePhaseCompletion = useCallback(() => {
    const elapsedMs = (totalSecondsForPhase - secondsRemaining) * 1000;
    const actualElapsed = elapsedMs > 0 ? elapsedMs : totalSecondsForPhase * 1000;

    const newEvent: TimelineEntry = {
      type: currentPhase,
      durationMs: actualElapsed,
      startedAt: new Date(phaseStartTimeRef.current).toISOString(),
    };

    const updatedEvents = [...timelineEvents, newEvent];

    if (timerType === 'pomodoro' && currentPhase === 'focus') {
      // Transition from Focus to Break
      setTimelineEvents(updatedEvents);
      setCurrentPhase('break');
      const breakSecs = TIMER_CONFIGS.pomodoro.breakMs / 1000;
      setSecondsRemaining(breakSecs);
      setTotalSecondsForPhase(breakSecs);
      phaseStartTimeRef.current = Date.now();
      setTimerState('running');
      Alert.alert('Focus Time Up!', 'Time for a 5-minute break. Keep it up! 🥤');
    } else {
      // For standard sessions, or completing the break part of a Pomodoro
      saveSession(updatedEvents);
    }
  }, [currentPhase, secondsRemaining, totalSecondsForPhase, timelineEvents, timerType, saveSession]);

  // Start the timer
  const startTimer = useCallback(() => {
    haptic.impactMedium();
    const config = TIMER_CONFIGS[timerType];
    const initialMs = config.focusMs;

    setSecondsRemaining(initialMs / 1000);
    setTotalSecondsForPhase(initialMs / 1000);
    setCurrentPhase('focus');
    setTimelineEvents([]);
    setTimerState('running');
    phaseStartTimeRef.current = Date.now();
  }, [timerType]);

  // Pause
  const pauseTimer = useCallback(() => {
    haptic.impactMedium();
    setTimerState('paused');
  }, []);

  // Resume
  const resumeTimer = useCallback(() => {
    haptic.impactMedium();
    setTimerState('running');
  }, []);

  // Reset
  const resetTimer = useCallback(() => {
    haptic.impactHeavy();
    setTimerState('idle');
    setSecondsRemaining(0);
    setTotalSecondsForPhase(0);
    setTimelineEvents([]);
  }, []);

  // Fast-forward to last 3 seconds (Testing Hook)
  const fastForward = useCallback(() => {
    setSecondsRemaining(prev => (prev > 3 ? 3 : prev));
  }, []);

  // Tick-tock interval effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState === 'running') {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            handlePhaseCompletion();
            return 0;
          }
          // Play countdown anticipation tick in the last 3 seconds
          if (prev <= 4) {
            haptic.selection();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, handlePhaseCompletion]);

  return {
    timerType,
    setTimerType,
    timerState,
    setTimerState,
    currentPhase,
    secondsRemaining,
    totalSecondsForPhase,
    sessionResult,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    fastForward,
  };
}
