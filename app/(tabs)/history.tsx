import React, { useState, useEffect, useCallback } from 'react';
import {StyleSheet,View,Text,FlatList,ScrollView,TouchableOpacity,RefreshControl,ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Radii, Spacing } from '@/constants/Colors';
import { Session } from '@/types/api';
import { API_BASE_URL } from '@/constants/Api';

const STUDENT_ID = 'stu_01';

// format date strings 
function formatSessionDate(epochMs: number): string {
  const date = new Date(epochMs);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfSevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const timeStr = `${hours}:${minutes} ${ampm}`;

  if (epochMs >= startOfToday) {
    return `Today, ${timeStr}`;
  } else if (epochMs >= startOfYesterday) {
    return `Yesterday, ${timeStr}`;
  } else if (epochMs >= startOfSevenDaysAgo) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]}, ${timeStr}`;
  } else {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec',];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}, ${timeStr}`;
  }
}

//Session Icon display
function getSessionTypeDetails(type: string) {
  switch (type) {
    case 'deep_focus':
      return { label: 'Deep Focus', emoji: '🎯', bgColor: Colors.primaryLight };
    case 'quick_sprint':
      return { label: 'Quick Sprint', emoji: '⚡', bgColor: Colors.amberLight };
    case 'pomodoro':
      return { label: 'Pomodoro', emoji: '🍅', bgColor: '#FEE2E2' }; // Light red/pink bg
    default:
      return { label: 'Focus Session', emoji: '🎯', bgColor: Colors.primaryLight };
  }
}

type FilterType = 'today' | 'week' | 'month' | 'all';

export default function HistoryScreen() {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Page 1 of sessions
  const fetchSessions = useCallback(
    async (filter: FilterType, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);

      try {
        const filterQuery = filter === 'all' ? '' : `&filter=${filter}`;
        const response = await fetch(
          `${API_BASE_URL}/students/${STUDENT_ID}/sessions?limit=10${filterQuery}`
        );

        if (!response.ok) {
          throw new Error('Failed to load session history');
        }

        const data = await response.json();
        setSessions(data.data);
        setCursor(data.cursor);
        setHasMore(data.hasMore);
      } catch (err: any) {
        console.error(err);
        setError("We're having trouble loading your history. Please check your internet connection and try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Load more sessions (Infinite Scroll)
  const fetchMoreSessions = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    try {
      const filterQuery = activeFilter === 'all' ? '' : `&filter=${activeFilter}`;
      const response = await fetch(
        `${API_BASE_URL}/students/${STUDENT_ID}/sessions?limit=10&cursor=${cursor}${filterQuery}`
      );

      if (!response.ok) {
        throw new Error('Failed to load more sessions');
      }

      const data = await response.json();
      setSessions(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const filteredNew = data.data.filter((s: Session) => !existingIds.has(s.id));
        return [...prev, ...filteredNew];
      });
      setCursor(data.cursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, activeFilter]);

  // Handle initial mount and filter change
  useEffect(() => {
    fetchSessions(activeFilter);
  }, [activeFilter, fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions(activeFilter, true);
  }, [activeFilter, fetchSessions]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  // Render a skeleton loader card
  const renderSkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMeta} />
      </View>
      <View style={styles.skeletonCoins} />
    </View>
  );

  // Loading skeleton state (renders 5 placeholder cards)
  const renderSkeletonList = () => (
    <View style={styles.listContainer}>
      {Array.from({ length: 5 }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeletonCard()}</React.Fragment>
      ))}
    </View>
  );

  // Render a single session card
  const renderItem = ({ item }: { item: Session }) => {
    const details = getSessionTypeDetails(item.type);
    const durationMin = Math.round(item.durationMs / 60000);

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/session/${item.id}`)}
      >
        <View style={[styles.sessionIcon, { backgroundColor: details.bgColor }]}>
          <Text style={styles.sessionEmoji}>{details.emoji}</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{details.label}</Text>
          <Text style={styles.sessionMeta}>
            {durationMin} min &middot; {formatSessionDate(item.startedAt)}
          </Text>
        </View>
        <Text style={styles.sessionCoins}>+{item.coins}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Title */}
      <Text style={styles.pageTitle}>History</Text>

      {/* Horizontal Scroll Filter Pills */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'today', 'week', 'month'] as FilterType[]).map(filter => {
            const isActive = activeFilter === filter;
            const label = filter.charAt(0).toUpperCase() + filter.slice(1).replace('all', 'All');
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isActive ? styles.activePill : styles.inactivePill]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, isActive ? styles.activeText : styles.inactiveText]}>
                  {label === 'Week' ? 'This Week' : label === 'Month' ? 'This Month' : label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List / Skeleton / Error / Empty States */}
      {loading ? (
        renderSkeletonList()
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchSessions(activeFilter)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>No Sessions Found</Text>
          <Text style={styles.emptyText}>
            You haven't completed any focus sessions for this period yet.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          onEndReached={fetchMoreSessions}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.footerText}>Loading more sessions...</Text>
              </View>
            ) : hasMore ? (
              <View style={styles.footerLoader}>
                <Text style={styles.footerScrollText}>Scroll for more</Text>
              </View>
            ) : (
              <View style={styles.footerLoader}>
                <Text style={styles.footerScrollText}>You've reached the end</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  filterWrapper: {
    marginBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
  },
  activePill: {
    backgroundColor: Colors.primary,
  },
  inactivePill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  activeText: {
    color: Colors.surface,
  },
  inactiveText: {
    color: Colors.textSecondary,
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    gap: 10,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.statCard,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Shadows.card,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionEmoji: {
    fontSize: 18,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  sessionMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  sessionCoins: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.success,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
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
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  footerScrollText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textTertiary,
  },
  // Skeleton Loader styling
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.statCard,
    paddingVertical: 14,
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  skeletonInfo: {
    flex: 1,
    gap: 6,
  },
  skeletonTitle: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonMeta: {
    width: 140,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonCoins: {
    width: 30,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
});
