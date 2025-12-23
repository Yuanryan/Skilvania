"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface StartButtonProps {
  onStartClick: () => void;
}

export function StartButton({ onStartClick }: StartButtonProps) {
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const [buttonHeight, setButtonHeight] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Measure initial button dimensions on mount
  useEffect(() => {
    if (buttonRef.current && (!buttonWidth || !buttonHeight)) {
      const width = buttonRef.current.offsetWidth;
      const height = buttonRef.current.offsetHeight;
      if (width > 0 && height > 0) {
        setButtonWidth(width);
        setButtonHeight(height);
      }
    }
  }, [buttonWidth, buttonHeight]);

  const { scrollY } = useScroll();

  // Animation Transforms
  // Phase 1 (0-700px): Transform button to round seed (width, height, borderRadius)
  // Phase 2 (700-850px): Move the seed down (y movement only starts after fully round)
  const width = useTransform(scrollY, [0, 700], [buttonWidth || 220, 64]);
  const height = useTransform(scrollY, [0, 700], [buttonHeight || 64, 64]);
  const borderRadius = useTransform(scrollY, [0, 700], ["0.75rem", "50%"]);
  
  // Content fades out quickly during transformation phase
  const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const contentScale = useTransform(scrollY, [0, 300], [1, 0.5]);
  
  // Movement: Only starts AFTER button is fully round (at 700px)
  // The button stays in place (y=0) until scroll reaches 700px, then moves down
  // Phase 2a (700-850px): Falls 150px while page is still fixed
  // Phase 2b (850-1400px): Continues falling into explore section as page scrolls
  // Total fall: 150px + 200px = 350px to reach explore section (200px higher)
  const y = useTransform(scrollY, [700, 1400], [0, 350]);
  
  // Phase 3 (1200-1400px): Seed fades away as it reaches the tree root
  const seedOpacity = useTransform(scrollY, [1200, 1400], [1, 0]);
  
  // Scale down to seed size - happens during transformation phase
  const scale = useTransform(scrollY, [0, 700], [1, 0.5]);
  
  // Box shadow glow increases as it becomes a seed - brighter and more intense
  const boxShadow = useTransform(
    scrollY,
    [0, 700],
    [
      '0 10px 40px rgba(16, 185, 129, 0)', 
      '0 0 40px rgba(52, 211, 153, 1), 0 0 80px rgba(16, 185, 129, 0.6)'
    ]
  );
  
  // Background color gets brighter as it becomes a seed
  const backgroundColor = useTransform(
    scrollY,
    [0, 700],
    [
      'rgb(5, 150, 105)', // emerald-600
      'rgb(52, 211, 153)' // emerald-400 - brighter
    ]
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onStartClick();
  };

  return (
    <div 
      className="relative h-16 flex items-center justify-center z-50"
      style={{ 
        width: buttonWidth ? `${buttonWidth}px` : 'auto',
        minWidth: buttonWidth ? `${buttonWidth}px` : 'auto'
      }}
    >
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        style={buttonWidth ? {
          width,
          height,
          borderRadius,
          y,
          scale,
          opacity: seedOpacity,
          boxShadow,
          backgroundColor,
          position: 'relative', // Ensure transforms work
        } : undefined}
        className="px-8 py-4 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 overflow-hidden"
      >
        <motion.span
          style={{ opacity: contentOpacity, scale: contentScale }}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          Start Your Journey <ArrowRight size={20} />
        </motion.span>
      </motion.button>
    </div>
  );
}
