import React from 'react';
import { RestaurantSpot } from '../types';

interface ReactionStampsBarProps {
  spot: RestaurantSpot;
  onToggleReaction: (spotId: string, emoji: string) => void;
  size?: 'sm' | 'md';
}

export const REACTION_STAMPS = [
  { emoji: '❤️', label: '行きたい' },
  { emoji: '😋', label: '美味しそう' },
  { emoji: '🥂', label: '行こう！' },
  { emoji: '🔥', label: '気になる' },
];

export const ReactionStampsBar: React.FC<ReactionStampsBarProps> = ({
  spot,
  onToggleReaction,
  size = 'sm',
}) => {
  const reactions = spot.reactions || {};
  const userReactions = spot.userReactions || [];

  return (
    <div
      className={`flex items-center gap-1 sm:gap-1.5 flex-wrap ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      }`}
    >
      {REACTION_STAMPS.map(({ emoji, label }) => {
        const count = reactions[emoji] || 0;
        const isSelected = userReactions.includes(emoji);

        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(spot.id, emoji);
            }}
            className={`inline-flex items-center gap-1 rounded-full font-bold transition-all cursor-pointer border active:scale-90 ${
              size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
            } ${
              isSelected
                ? 'bg-[#2D4B3E] text-white border-[#2D4B3E] shadow-2xs'
                : count > 0
                ? 'bg-[#E8ECE8] text-[#2D4B3E] border-[#C5D8C5]'
                : 'bg-stone-50 hover:bg-[#E8ECE8]/60 text-stone-600 border-stone-200'
            }`}
            title={`${label} スタンプを押す`}
          >
            <span>{emoji}</span>
            <span className="font-semibold">{label}</span>
            {count > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isSelected ? 'bg-emerald-200 text-[#2D4B3E]' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
