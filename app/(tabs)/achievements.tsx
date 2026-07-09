import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,View,Text,FlatList,TouchableOpacity,RefreshControl,Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Radii, Spacing } from '@/constants/Colors';
import { Achievement } from '@/types/api';
import { API_BASE_URL } from '@/constants/Api';
import { BadgeCard, getIoniconsName } from '@/components/BadgeCard';

const STUDENT_ID = 'stu_01';

// unlock date
function formatUnlockDate(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected achievement for the bottom detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Panel spring animations
  const panelScale = useRef(new Animated.Value(0.95)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  // Fetch achievements list
  const fetchAchievements = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/students/${STUDENT_ID}/achievements`);
      if (!response.ok) {
        throw new Error('Failed to load achievements');
      }
      const data = (await response.json()) as Achievement[];
      setAchievements(data);

      // default achievement 
      if (data.length > 0) {
        setSelectedId(prev => {
          const exists = data.some(a => a.id === prev);
          return exists ? prev : data[0].id;
        });
      }
    } catch (err: any) {
      console.error(err);
      setError("We're having trouble loading your achievements. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Spring animation when selected badge changes
  useEffect(() => {
    if (selectedId) {
      panelScale.setValue(0.95);
      panelOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(panelScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [selectedId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAchievements(true);
  }, [fetchAchievements]);

  const selectedAchievement = achievements.find(a => a.id === selectedId);
  const unlockedCount = achievements.filter(a => a.unlockedAt !== null).length;
  const totalCount = achievements.length;
  const progressRatio = totalCount > 0 ? unlockedCount / totalCount : 0;

  const renderItem = ({ item }: { item: Achievement }) => {
    return (
      <BadgeCard
        item={item}
        isSelected={item.id === selectedId}
        onPress={() => setSelectedId(item.id)}
      />
    );
  };

  // Render Loading Skeleton Layout
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonProgressCard} />
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <View key={idx} style={styles.skeletonBadge} />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Title */}
      <Text style={styles.pageTitle}>Achievements</Text>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchAchievements()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Top Overall Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Badge Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {unlockedCount} of {totalCount} achievements unlocked
                </Text>
              </View>
              <View style={styles.trophyIconBox}>
                <Ionicons name="trophy" size={24} color={Colors.amber} />
              </View>
            </View>

            {/* Progress Bar track */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>

          {/* Grid FlatList */}
          <FlatList
            data={achievements}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          />

          {/* Bottom Detail Panel */}
          {selectedAchievement && (
            <Animated.View
              style={[
                styles.detailPanel,
                {
                  opacity: panelOpacity,
                  transform: [{ scale: panelScale }],
                },
              ]}
            >
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.detailIconBg,
                    selectedAchievement.unlockedAt !== null
                      ? styles.unlockedIconBg
                      : styles.lockedIconBg,
                  ]}
                >
                  <Ionicons
                    name={getIoniconsName(selectedAchievement.icon)}
                    size={28}
                    color={
                      selectedAchievement.unlockedAt !== null ? Colors.primary : Colors.textTertiary
                    }
                  />
                </View>
                <View style={styles.detailTitleBox}>
                  <Text style={styles.detailName}>{selectedAchievement.name}</Text>
                  <Text style={styles.detailStatus}>
                    {selectedAchievement.unlockedAt !== null
                      ? `Unlocked on ${formatUnlockDate(selectedAchievement.unlockedAt)}`
                      : 'Locked'}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailDesc}>{selectedAchievement.description}</Text>

              {/* Progress Slider (current/target) */}
              <View style={styles.detailProgressContainer}>
                <View style={styles.detailProgressLabels}>
                  <Text style={styles.detailProgressTitle}>Goal Progress</Text>
                  <Text style={styles.detailProgressVal}>
                    {selectedAchievement.current} / {selectedAchievement.target}
                  </Text>
                </View>
                <View style={styles.detailProgressBg}>
                  <View
                    style={[
                      styles.detailProgressFill,
                      { width: `${selectedAchievement.progress}%` },
                    ]}
                  />
                </View>
              </View>
            </Animated.View>
          )}
        </View>
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
  content: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  progressSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trophyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 12,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 240, // Ensure list content has space to scroll above detail card
    gap: 12,
  },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    ...Shadows.cta,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  unlockedIconBg: {
    backgroundColor: Colors.primaryLight,
  },
  lockedIconBg: {
    backgroundColor: '#F3F4F6',
  },
  detailTitleBox: {
    flex: 1,
  },
  detailName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  detailStatus: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  detailDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  detailProgressContainer: {
    gap: Spacing.xs,
  },
  detailProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailProgressTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailProgressVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.text,
  },
  detailProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
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
  // Skeleton styling
  skeletonContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  skeletonProgressCard: {
    height: 80,
    borderRadius: Radii.card,
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skeletonBadge: {
    width: '30%',
    aspectRatio: 0.95,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
});
