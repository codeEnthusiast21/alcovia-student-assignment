import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing } from '@/constants/Colors';
import { Achievement } from '@/types/api';
import { haptic } from '@/constants/Haptics';

// Map icon string to a guaranteed Ionicons glyph name
export function getIoniconsName(iconName: string): any {
  switch (iconName) {
    case 'footsteps': return 'footsteps';
    case 'shield': return 'shield';
    case 'cash': return 'cash';
    case 'flame': return 'flame';
    case 'sunny': return 'sunny';
    case 'bonfire': return 'bonfire';
    case 'wallet': return 'wallet';
    case 'trophy': return 'trophy';
    case 'moon': return 'moon';
    case 'checkmark-done': return 'checkmark-done';
    case 'people': return 'people';
    case 'diamond': return 'ribbon'; // Fallback to ribbon because diamond is not in standard Ionicons
    default: return 'trophy';
  }
}

interface BadgeCardProps {
  item: Achievement;
  isSelected: boolean;
  onPress: () => void;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ item, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isUnlocked = item.unlockedAt !== null;
  const iconName = getIoniconsName(item.icon);

  const handlePress = () => {
    // Play light tactile selection feedback
    haptic.selection();
    
    // Trigger parent callback
    onPress();

    // Trigger spring bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        style={[
          styles.badgeCard,
          isSelected && styles.selectedBadgeCard,
          !isUnlocked && styles.lockedBadgeCard,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Badge Icon wrapper */}
        <View
          style={[
            styles.badgeIconBg,
            isUnlocked ? styles.unlockedIconBg : styles.lockedIconBg,
          ]}
        >
          <Ionicons
            name={iconName}
            size={22}
            color={isUnlocked ? Colors.primary : Colors.textTertiary}
          />
          {isUnlocked && (
            <View style={styles.checkmarkBadge}>
              <Ionicons name="checkmark" size={8} color={Colors.surface} />
            </View>
          )}
        </View>

        {/* Badge title */}
        <Text
          numberOfLines={1}
          style={[
            styles.badgeTitle,
            isUnlocked ? styles.unlockedTitle : styles.lockedTitle,
          ]}
        >
          {item.name}
        </Text>

        {/* Small Progress / Lock label */}
        <Text style={styles.badgeProgressText}>
          {isUnlocked ? 'Unlocked' : `${item.current}/${item.target}`}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeCard: {
    width: (Platform.OS === 'web' ? 100 : 104),
    flex: 1,
    aspectRatio: 0.95,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  selectedBadgeCard: {
    borderColor: Colors.primary,
  },
  lockedBadgeCard: {
    opacity: 0.7,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  badgeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  unlockedIconBg: {
    backgroundColor: Colors.primaryLight,
  },
  lockedIconBg: {
    backgroundColor: '#F3F4F6',
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  unlockedTitle: {
    color: Colors.text,
  },
  lockedTitle: {
    color: Colors.textSecondary,
  },
  badgeProgressText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.textTertiary,
  },
});
