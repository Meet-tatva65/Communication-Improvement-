import React from 'react';
import { StarIcon } from './icons';

interface RatingDisplayProps {
  score: number;
  maxScore?: number;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({ score, maxScore = 5 }) => {
  const filledStars = Math.floor(score);
  const partialStar = score % 1;
  const emptyStars = maxScore - Math.ceil(score);

  return (
    <div className="flex">
      {Array.from({ length: filledStars }).map((_, i) => (
        <StarIcon key={`full-${i}`} className="w-5 h-5 text-yellow-400" fill="currentColor" />
      ))}
      {partialStar > 0 && (
        <div className="relative w-5 h-5">
          <StarIcon className="absolute top-0 left-0 w-5 h-5 text-yellow-400" fill="none" />
          <div style={{ width: `${partialStar * 100}%`, overflow: 'hidden' }}>
            <StarIcon className="w-5 h-5 text-yellow-400" fill="currentColor" />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <StarIcon key={`empty-${i}`} className="w-5 h-5 text-gray-600" fill="currentColor" />
      ))}
    </div>
  );
};
