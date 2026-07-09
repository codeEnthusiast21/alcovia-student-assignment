import React, { useState, useEffect, useCallback } from 'react';
import {StyleSheet,View,Text,ScrollView,TouchableOpacity,ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radii, Spacing } from '@/constants/Colors';
import { SessionDetail } from '@/types/api';
import { API_BASE_URL } from '@/constants/Api';

const STUDENT_ID = 'stu_01';

// Format ISO string to date + time
function formatFullDateTime(isoString: string): string {
  const date = new Date(isoString);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${hours}:${minutes} ${ampm}`;
}

// Format ISO string to time
function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes} ${ampm}`;
}

// Session Style
function getSessionStyle(type: string) {
  switch (type) {
    case 'deep_focus':
      return { label: 'Deep Focus', emoji: '🎯', bgColor: Colors.primaryLight, color: Colors.primary };
    case 'quick_sprint':
      return { label: 'Quick Sprint', emoji: '⚡', bgColor: Colors.amberLight, color: Colors.amber };
    case 'pomodoro':
      return { label: 'Pomodoro', emoji: '🍅', bgColor: '#FEE2E2', color: Colors.error };
    default:
      return { label: 'Focus Session', emoji: '🎯', bgColor: Colors.primaryLight, color: Colors.primary };
  }
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${STUDENT_ID}/sessions/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session details not found.');
        }
        throw new Error('Failed to load session details.');
      }
      const data = await response.json();
      setSession(data);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Session details not found.') {
        setError(err.message);
      } else {
        setError("We're having trouble loading this session's details. Please check your internet connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: Spacing.md }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtnTextOnly} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const styleDetails = getSessionStyle(session.type);
  const durationMin = Math.round(session.durationMs / 60000);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Info Card */}
        <View style={styles.infoCard}>
          <View style={[styles.sessionIcon, { backgroundColor: styleDetails.bgColor }]}>
            <Text style={styles.sessionEmoji}>{styleDetails.emoji}</Text>
          </View>
          <Text style={styles.sessionTitle}>{styleDetails.label}</Text>
          <Text style={styles.sessionDate}>{formatFullDateTime(session.startedAt)}</Text>

          {/* Stats Breakdown Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{durationMin} min</Text>
              <Text style={styles.gridLabel}>Duration</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.gridItem}>
              <Text style={styles.gridValueCoins}>+{session.coins}</Text>
              <Text style={styles.gridLabel}>Coins Earned</Text>
            </View>
          </View>
        </View>

        {/* Section: Timeline */}
        <Text style={styles.sectionHeading}>Timeline Breakdown</Text>
        <View style={styles.timelineContainer}>
          {session.timeline.map((item, idx) => {
            const isFocus = item.type === 'focus';
            const isLast = idx === session.timeline.length - 1;
            const timeLabel = formatTimeOnly(item.startedAt);
            const durationLabel = Math.round(item.durationMs / 60000);

            return (
              <View key={idx} style={styles.timelineItem}>
                {/* Vertical Line */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIndicator,
                      isFocus ? styles.indicatorFocus : styles.indicatorBreak,
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Event Details */}
                <View style={styles.timelineRight}>
                  <View style={styles.timelineEventHeader}>
                    <Text style={styles.timelineEventTitle}>
                      {isFocus ? 'Focus Block' : 'Rest Break'}
                    </Text>
                    <Text style={styles.timelineEventTime}>{timeLabel}</Text>
                  </View>
                  <Text style={styles.timelineEventDesc}>
                    {isFocus
                      ? `Focused continuously for ${durationLabel} minutes`
                      : `Took a short resting break of ${durationLabel} minutes`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: Spacing.xl,
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
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backBtnTextOnly: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.button,
  },
  backBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.surface,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.card,
    marginBottom: Spacing.xxl,
  },
  sessionIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sessionEmoji: {
    fontSize: 32,
  },
  sessionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sessionDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xl,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  gridValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  gridValueCoins: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.success,
  },
  gridLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  timelineContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  indicatorFocus: {
    backgroundColor: Colors.primary,
  },
  indicatorBreak: {
    backgroundColor: Colors.amber,
  },
  timelineLine: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    width: 2,
    backgroundColor: Colors.border,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineEventTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  timelineEventTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timelineEventDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
