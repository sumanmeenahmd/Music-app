import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface CoverArtProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CoverArt: React.FC<CoverArtProps> = ({
  src,
  alt,
  className = '',
  size = 'md',
}) => {
  const [failed, setFailed] = useState(false);

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1C212C] to-[#11141B] text-amber-400/70 border border-white/[0.08] shrink-0 ${className}`}
        aria-label={alt}
      >
        <Disc3 className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-[#13161D] shrink-0 ${className}`}
    />
  );
};
