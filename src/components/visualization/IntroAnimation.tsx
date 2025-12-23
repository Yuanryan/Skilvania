"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<'seed' | 'branches' | 'fade'>('seed');

  useEffect(() => {
    // Sequence the animation stages
    const seedTimer = setTimeout(() => setStage('branches'), 800);
    const branchTimer = setTimeout(() => {
        setStage('fade');
        // Trigger content reveal slightly before overlay is fully gone
        setTimeout(onComplete, 200); 
    }, 2500);

    return () => {
      clearTimeout(seedTimer);
      clearTimeout(branchTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-hidden pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 'fade' ? 0 : 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (stage === 'fade') {
            // Unmount is handled by parent or it just stays hidden/removed
        }
      }}
    >
        {/* Background Effects matching landing page to smooth transition */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-transparent to-transparent"></div>
        </div>

      <div className="relative w-full h-full max-w-7xl mx-auto">
        {/* Seed Animation */}
        {stage !== 'fade' && (
            <motion.div
            initial={{ y: "100vh", opacity: 0, scale: 0.5 }}
            animate={
                stage === 'seed' 
                ? { y: "50vh", opacity: 1, scale: 1 } 
                : { y: "25vh", opacity: 0, scale: 2 }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.8)]"
            />
        )}

        {/* Branching Lines - Simplified Organic Pattern */}
        {stage === 'branches' && (
            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="branchGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
                        <stop offset="50%" stopColor="rgba(16, 185, 129, 0.4)" />
                        <stop offset="100%" stopColor="rgba(52, 211, 153, 0.8)" />
                    </linearGradient>
                </defs>
                {/* Center trunk */}
                <motion.path
                    d="M 50% 100% L 50% 25%"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    stroke="url(#branchGradient)"
                    strokeWidth="4"
                    fill="none"
                    // @ts-ignore
                    style={{ x: "50%" }} // Centering hack for SVG coords if needed, but 50% in d works usually
                />
                
                {/* Branches radiating out */}
                {[...Array(8)].map((_, i) => (
                    <Branch key={i} index={i} total={8} />
                ))}
            </svg>
        )}
      </div>
    </motion.div>
  );
}

function Branch({ index, total }: { index: number, total: number }) {
    // Calculate angle and control points for a nice organic spread
    // Start from center screen (50% 25%)
    // Spread to different areas of the screen
    
    // We want to target rough grid areas. 
    // Let's assume a grid 3 cols, roughly spread out.
    // Angles: -60 to +60 degrees from vertical up, and maybe some side ones.
    
    const angleStep = 180 / (total - 1); // Spread over top 180 degrees
    const angle = -90 + (index * angleStep); // -90 (left) to 90 (right)
    const rad = (angle * Math.PI) / 180;
    
    const startX = 50; // percent
    const startY = 25; // percent
    
    // End points randomly distributed in the upper portion
    const endX = 50 + (Math.cos(rad) * 40) + (Math.random() * 10 - 5);
    const endY = 25 + (Math.sin(rad) * 25) + (Math.random() * 10 - 5);
    
    // Quadratic Bezier curve
    const cpX = 50 + (Math.cos(rad) * 20);
    const cpY = 25 + (Math.sin(rad) * 15);

    const d = `M ${startX}% ${startY}% Q ${cpX}% ${cpY}% ${endX}% ${endY}%`;

    return (
        <motion.path
            d={d}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.6, 0] }}
            transition={{ 
                duration: 1.5, 
                ease: "easeOut",
                delay: Math.random() * 0.3 // Stagger
            }}
            stroke="rgba(52, 211, 153, 0.4)"
            strokeWidth="2"
            fill="none"
        />
    );
}

