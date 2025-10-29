
import React from 'react';
import { StarIcon } from './icons';

interface RatingDisplayProps {
  score: number;
  maxScore?: number;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({ score, maxScore = 5 }) => {
  const stars = Array.from({ length: maxScore }, (_, index) => {
    const starValue = index + 1;
    let fill = 'none';
    if (score >= starValue) {
      fill = 'currentColor';
    } else if (score > starValue - 1 && score < starValue) {
      // This logic can be enhanced for half stars if needed
      // For simplicity, we'll just fill if score is >= value
    }
    return <StarIcon key={index} className="w-5 h-5 text-yellow-400" fill={fill} />;
  });

  return <div className="flex items-center">{stars}</div>;
};
