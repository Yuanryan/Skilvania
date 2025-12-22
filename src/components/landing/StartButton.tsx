"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface StartButtonProps {
  onStartClick: () => void;
}

export function StartButton({ onStartClick }: StartButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const [buttonHeight, setButtonHeight] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Measure initial button dimensions on mount
  useEffect(() => {
    if (buttonRef.current && !isAnimating && (!buttonWidth || !buttonHeight)) {
      const width = buttonRef.current.offsetWidth;
      const height = buttonRef.current.offsetHeight;
      setButtonWidth(width);
      setButtonHeight(height);
    }
  }, [isAnimating, buttonWidth, buttonHeight]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Ensure we have the dimensions before animating
    if (buttonRef.current && (!buttonWidth || !buttonHeight)) {
      const width = buttonRef.current.offsetWidth;
      const height = buttonRef.current.offsetHeight;
      setButtonWidth(width);
      setButtonHeight(height);
    }
    setIsAnimating(true);
    
    // Trigger scroll after shrink completes, before shooting
    setTimeout(() => {
      onStartClick();
    }, 750); // After shrink completes (reduced from 800ms for faster scroll)
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
        disabled={isAnimating}
        whileHover={!isAnimating ? { scale: 1.05 } : {}}
        whileTap={!isAnimating ? { scale: 0.95 } : {}}
        animate={isAnimating ? {
          width: '4rem',
          height: buttonHeight ? `${buttonHeight}px` : '4rem', // Keep original height
          borderRadius: '50%',
          backgroundColor: '#34d399',
          left: '50%',
          x: '-50%',
          y: [0, 0, 2000],
          scale: [1, 1, 0.5],
          opacity: [1, 1, 0],
          boxShadow: [
            '0 10px 40px rgba(16, 185, 129, 0.5)',
            '0 0 20px rgba(52, 211, 153, 0.6)',
            '0 0 40px rgba(52, 211, 153, 1)'
          ]
        } : {
          width: 'auto',
          height: 'auto',
          borderRadius: '0.75rem',
          backgroundColor: '#059669',
          left: 'auto',
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
        }}
        transition={isAnimating ? {
          width: { 
            duration: 0.8, 
            ease: [0.25, 0.1, 0.25, 1] // Faster initial shrink to avoid oval
          },
          height: {
            duration: 0 // Keep height constant - no animation
          },
          borderRadius: { 
            duration: 0.8, // Gradually round throughout the entire animation
            ease: [0.4, 0, 0.2, 1] 
          },
          backgroundColor: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          left: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          x: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          y: { duration: 1.2, delay: 0.8, ease: "easeIn", times: [0, 0, 1] },
          scale: { duration: 1.2, delay: 0.8, ease: "easeIn", times: [0, 0, 1] },
          opacity: { duration: 1.2, delay: 0.8, ease: "easeIn", times: [0, 0, 1] },
          boxShadow: { duration: 1.2, delay: 0.8, ease: "easeIn", times: [0, 0, 1] }
        } : {
          duration: 0.2
        }}
        className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 overflow-hidden disabled:cursor-default"
        style={{
          position: isAnimating ? 'absolute' : 'relative',
        }}
      >
        <motion.span
          animate={isAnimating ? {
            opacity: 0,
            scale: 0.3,
            x: -20
          } : {
            opacity: 1,
            scale: 1,
            x: 0
          }}
          transition={isAnimating ? {
            opacity: { duration: 0.3, ease: "easeIn" },
            scale: { duration: 0.3, ease: "easeIn" },
            x: { duration: 0.3, ease: "easeIn" }
          } : {
            duration: 0.2
          }}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          Start Your Journey <ArrowRight size={20} />
        </motion.span>
      </motion.button>
    </div>
  );
}
