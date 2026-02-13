import { Trophy, Star, Award } from 'lucide-react';

export interface Badge {
  name: string;
  color: string;
  icon: string;
  minPoints: number;
}

export const badges: Badge[] = [
  { name: 'Newcomer', color: 'gray', icon: '🌱', minPoints: 0 },
  { name: 'Regular', color: 'blue', icon: '⭐', minPoints: 50 },
  { name: 'Expert', color: 'green', icon: '🏆', minPoints: 100 },
  { name: 'Master', color: 'purple', icon: '👑', minPoints: 200 },
  { name: 'Legend', color: 'yellow', icon: '🌟', minPoints: 500 }
];

export function getBadgeInfo(points: number): Badge {
  return badges.reduce((highest, badge) => {
    if (points >= badge.minPoints && badge.minPoints >= highest.minPoints) {
      return badge;
    }
    return highest;
  }, badges[0]);
}