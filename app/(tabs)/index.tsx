 import React, { useState, useEffect, useCallback, useRef } from 'react';
import {StyleSheet,View,Text,ScrollView,TouchableOpacity,ActivityIndicator,RefreshControl,Animated,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Radii, Spacing } from '@/constants/Colors';
import { Student, WeeklyStats, DayStat } from '@/types/api';
import { API_BASE_URL } from '@/constants/Api';
import { haptic } from '@/constants/Haptics';
import { ProgressRing } from '@/components/ProgressRing';

const STUDENT_ID = 'stu_01';

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState<WeeklyStats | null>(null);


  const anims = useRef([
    { opacity: new Animated.Value(0), y: new Animated.Value(15) }, // Stats Cards Row
    { opacity: new Animated.Value(0), y: new Animated.Value(15) }, // This Week Chart Card
    { opacity: new Animated.Value(0), y: new Animated.Value(15) }, // Today's Progress Card
    { opacity: new Animated.Value(0), y: new Animated.Value(15) }, // Start Focus CTA Button
  ]).current;

  useEffect(() => {
    if (!loading && student && stats) {
      anims.forEach(anim => {
        anim.opacity.setValue(0);
        anim.y.setValue(15);
      });

      const animations = anims.map(anim => {
        return Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          })
        ]);
      });

      Animated.stagger(100, animations).start();
    }
  }, [loading, student, stats]);

  // Fetch student profile and stats in parallel
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const [studentRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${STUDENT_ID}`),
        fetch(`${API_BASE_URL}/students/${STUDENT_ID}/stats?period=week`),
      ]);

      if (!studentRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data from the server');
      }

      const studentData = await studentRes.json();
      const statsData = await statsRes.json();

      setStudent(studentData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      setError(
        "We're having trouble connecting to the server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !student || !stats) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: Spacing.md }} />
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentDayOfWeekIdx = (new Date().getDay() + 6) % 7;

  // Progress card text selector
  const getProgressMsg = () => {
    const needed = stats.dailyGoal - stats.todayCompleted;
    if (needed <= 0) {
      return {
        title: 'Goal completed!',
        desc: "You've crushed your daily goal for today. 🔥",
      };
    }
    if (needed === 1) {
      return {
        title: 'Almost there!',
        desc: '1 more session to keep your streak alive',
      };
    }
    return {
      title: 'Let\'s start focus!',
      desc: `${needed} more sessions to complete your goal today`,
    };
  };

  const progressMsg = getProgressMsg();

  // Find max session count to scale the bar chart
  const maxSessionsInWeek = Math.max(
    ...stats.sessionsPerDay.map((d: DayStat) => d.count),
    3 // Default minimum scale
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingTitle}>Hey, {student.name.split(' ')[0]}</Text>
            <Text style={styles.greetingSubtitle}>Let's crush this week</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{student.initials}</Text>
          </View>
        </View>

        {/* Stats Row Cards */}
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: [{ translateY: anims[0].y }],
          }}
        >
          <View style={styles.statsRow}>
            {/* Card 1: Sessions */}
            <View style={[styles.statCard, styles.purpleCard]}>
              <Text style={styles.statIcon}>🎯</Text>
              <Text style={styles.statNumber}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>

            {/* Card 2: Coins */}
            <View style={[styles.statCard, styles.greenCard]}>
              <Text style={styles.statIcon}>🪙</Text>
              <Text style={styles.statNumber}>{student.totalCoins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>

            {/* Card 3: Streak */}
            <View style={[styles.statCard, styles.amberCard]}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statNumber}>{student.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </Animated.View>

        {/* Section: This Week */}
        <Animated.View
          style={{
            opacity: anims[1].opacity,
            transform: [{ translateY: anims[1].y }],
          }}
        >
          <Text style={styles.sectionHeading}>This Week</Text>
          <View style={styles.chartContainer}>
            {stats.sessionsPerDay.map((dayData: DayStat, idx: number) => {
              const isToday = idx === currentDayOfWeekIdx;
              const barHeightPercent = (dayData.count / maxSessionsInWeek) * 100;

              return (
                <View key={dayData.day} style={styles.chartCol}>
                  <View style={styles.barBackground}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${barHeightPercent}%` },
                        isToday ? styles.barFillToday : styles.barFillDefault,
                      ]}
                    />
                  </View>
                  <Text style={styles.chartDayText}>
                    {dayData.day.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Section: Today's Progress */}
        <Animated.View
          style={{
            opacity: anims[2].opacity,
            transform: [{ translateY: anims[2].y }],
          }}
        >
          <Text style={styles.sectionHeading}>Today's Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressRingWrapper}>
              <ProgressRing
                size={72}
                radius={40}
                strokeWidth={7}
                progress={stats.todayCompleted / stats.dailyGoal}
                color={Colors.primary}
                trackColor="#E5E7EB"
              >
                <View style={styles.ringCenter}>
                  <Text style={styles.ringTextVal}>{`${stats.todayCompleted}/${stats.dailyGoal}`}</Text>
                  <Text style={styles.ringTextSub}>sessions</Text>
                </View>
              </ProgressRing>
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressTitle}>{progressMsg.title}</Text>
              <Text style={styles.progressSubtitle}>{progressMsg.desc}</Text>
            </View>
          </View>
        </Animated.View>

        {/* CTA: Start Session */}
        <Animated.View
          style={{
            opacity: anims[3].opacity,
            transform: [{ translateY: anims[3].y }],
          }}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.8}
            onPress={() => {
              haptic.impactLight();
              router.push('/timer');
            }}
          >
            <Text style={styles.ctaText}>Start Session</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.button,
  },
  retryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  greetingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: Radii.statCard,
    alignItems: 'flex-start',
  },
  purpleCard: {
    backgroundColor: Colors.primaryLight,
  },
  greenCard: {
    backgroundColor: Colors.successLight,
  },
  amberCard: {
    backgroundColor: Colors.amberLight,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statNumber: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 26,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  sectionHeading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    width: 14,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barFillDefault: {
    backgroundColor: Colors.primaryLight,
  },
  barFillToday: {
    backgroundColor: Colors.primary,
  },
  chartDayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: 20,
    ...Shadows.card,
  },
  progressRingWrapper: {
    marginRight: Spacing.lg,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    ...Shadows.cta,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.surface,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTextVal: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    color: Colors.text,
    lineHeight: 18,
  },
  ringTextSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: Colors.textSecondary,
  },
});
