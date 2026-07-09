import React from 'react';
import {StyleSheet,View,Text,TouchableOpacity,ActivityIndicator,Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radii, Spacing } from '@/constants/Colors';
import { haptic } from '@/constants/Haptics';
import { ProgressRing } from '@/components/ProgressRing';
import {useTimer,TimerType,TIMER_CONFIGS,} from '@/hooks/useTimer';

export default function TimerScreen() {
  const router = useRouter();

  const {
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
  } = useTimer();

  const cancelTimer = () => {
    Alert.alert(
      'Abandon Session?',
      'Are you sure you want to stop? Your current focus time will not be recorded.',
      [
        { text: 'Keep Focusing', style: 'cancel' },
        {
          text: 'Quit Session',
          style: 'destructive',
          onPress: () => {
            setTimerState('idle');
          },
        },
      ]
    );
  };

  //format ticking seconds -> mm:ss
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  const currentTheme = TIMER_CONFIGS[timerType];

  //IDLE SELECTION MODE
  if (timerState === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Focus</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.selectionBody}>
          <Text style={styles.selectionTitle}>Choose Focus Mode</Text>
          <Text style={styles.selectionSubtitle}>
            Select the focus structure that works best for your workflow today.
          </Text>

          {/* Cards for selections */}
          <View style={styles.cardsWrapper}>
            {(['deep_focus', 'quick_sprint', 'pomodoro'] as TimerType[]).map(type => {
              const active = timerType === type;
              const details = TIMER_CONFIGS[type];

              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.selectionCard,
                    active && { borderColor: details.color, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setTimerType(type);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardIconBox, { backgroundColor: details.bgColor }]}>
                    <Text style={styles.cardEmoji}>{details.emoji}</Text>
                  </View>
                  <View style={styles.cardTextBox}>
                    <Text style={styles.cardTitle}>{details.label}</Text>
                    <Text style={styles.cardDesc}>
                      {type === 'deep_focus'
                        ? '25 min focus period. Great for deep project work.'
                        : type === 'quick_sprint'
                        ? '15 min rapid session. Best for quick tasks or clearing lists.'
                        : '25 min focus + 5 min break. Keep working in intervals.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Start CTA */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: currentTheme.color }]}
            onPress={startTimer}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>Start Focus Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // SAVING TRANSACTION STATE
  if (timerState === 'saving') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.savingText}>Recording your focus session...</Text>
      </SafeAreaView>
    );
  }

  // COMPLETED SUCCESS VIEW
  if (timerState === 'completed' && sessionResult) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeEmoji}>🎉</Text>
        </View>
        <Text style={styles.successTitle}>Session Completed!</Text>
        <Text style={styles.successSubtitle}>
          Amazing job! You successfully finished a {sessionResult.durationMin}-minute{' '}
          {sessionResult.typeLabel} session.
        </Text>

        <View style={styles.earningsBox}>
          <View style={styles.earningItem}>
            <Text style={styles.earningVal}>🪙 +{sessionResult.coins}</Text>
            <Text style={styles.earningLabel}>Coins Earned</Text>
          </View>
          <View style={styles.earningDivider} />
          <View style={styles.earningItem}>
            <Text style={styles.earningVal}>🔥 {sessionResult.streak}</Text>
            <Text style={styles.earningLabel}>Day Streak</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.successBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Text style={styles.successBtnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPaused = timerState === 'paused';
  const labelText =
    timerType === 'pomodoro'
      ? currentPhase === 'focus'
        ? 'Focusing Interval'
        : 'Resting Break'
      : 'Focusing Interval';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#1A1D26' }]}>
      {/* Ticking header */}
      <View style={[styles.header, { backgroundColor: '#1A1D26', borderBottomWidth: 0 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelTimer} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFF' }]}>{currentTheme.label}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.timerBody}>
        {/* Phase Type Label */}
        <Text style={[styles.timerPhaseLabel, { color: currentTheme.color }]}>
          {labelText.toUpperCase()}
        </Text>

        {/* Large SVG Circular Progress Bar */}
        <View style={styles.svgWrapper}>
          <ProgressRing
            size={220}
            radius={90}
            strokeWidth={8}
            progress={totalSecondsForPhase > 0 ? secondsRemaining / totalSecondsForPhase : 0}
            color={currentTheme.color}
            trackColor="#2A2F3D"
          >
            <View style={styles.timeDigitWrapper}>
              <Text style={styles.timeDigits}>{formatTime(secondsRemaining)}</Text>
              <Text style={styles.timeHelper}>remaining</Text>
            </View>
          </ProgressRing>
        </View>

        {/* Pause / Resume Controls */}
        <View style={styles.controlsRow}>
          {isPaused ? (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: Colors.success }]}
              onPress={resumeTimer}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={28} color="#FFF" />
              <Text style={styles.controlBtnText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: '#3A3F50' }]}
              onPress={pauseTimer}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={28} color="#FFF" />
              <Text style={styles.controlBtnText}>Pause</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.debugFFBtn} onPress={fastForward} activeOpacity={0.7}>
          <Ionicons name="speedometer-outline" size={16} color="#9CA3AF" />
          <Text style={styles.debugFFText}>Fast-forward (3s remaining)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2F3D',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  selectionBody: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxl,
  },
  selectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  selectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  cardsWrapper: {
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  selectionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  startButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cta,
  },
  startButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.surface,
  },
  // Active Timer Layout
  timerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xxl,
  },
  timerPhaseLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  svgWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDigitWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeDigits: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 42,
    color: '#FFF',
    letterSpacing: 1,
  },
  timeHelper: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  controlsRow: {
    width: '100%',
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    gap: 8,
    ...Shadows.card,
  },
  controlBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFF',
  },
  debugFFBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.5,
  },
  debugFFText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Success Celebration layout
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  savingText: {
    marginTop: Spacing.md,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successBadgeEmoji: {
    fontSize: 36,
  },
  successTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  earningsBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
    marginBottom: 40,
    ...Shadows.card,
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningVal: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
    color: Colors.text,
  },
  earningLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  earningDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  successBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cta,
  },
  successBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.surface,
  },
});
