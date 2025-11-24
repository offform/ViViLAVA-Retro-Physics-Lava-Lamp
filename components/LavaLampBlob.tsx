import React, { useMemo } from 'react';
import { BlobConfig } from '../types';

interface LavaLampBlobProps {
  config: BlobConfig;
  containerHeight: number;
  speed: number;
}

const LavaLampBlob: React.FC<LavaLampBlobProps> = ({ config, containerHeight, speed }) => {
  
  const animationName = useMemo(() => `float-${config.id}`, [config.id]);
  const travelDistance = containerHeight + config.size * 4;

  // ID 99 是母体球
  const isMotherBlob = config.id === 99;
  const behaviorType = isMotherBlob ? 1 : config.id % 3; 

  let keyframes = '';

  if (behaviorType === 0) {
    // 模式 0: 活跃型 (大幅度拉伸)
    keyframes = `
      @keyframes ${animationName} {
        0% { transform: translateY(${config.size}px) scale(1.1, 0.9); }
        15% { transform: translateY(-${travelDistance * 0.1}px) scale(0.85, 1.2); } 
        50% { transform: translateY(-${travelDistance * 0.5}px) scale(0.95, 1.05); }
        90% { transform: translateY(-${travelDistance * 0.9}px) scale(1.2, 0.85); }
        100% { transform: translateY(-${travelDistance}px) scale(1, 1); }
      }
    `;
  } else if (behaviorType === 1) {
    // 模式 1: 母体/悬停型 (底部蠕动)
    const hoverHeight = isMotherBlob ? containerHeight * 0.05 : containerHeight * 0.2;
    
    keyframes = `
      @keyframes ${animationName} {
        0% { transform: translateY(${config.size}px) scale(1.05, 0.95); }
        33% { transform: translateY(-${hoverHeight}px) scale(0.95, 1.05) rotate(2deg); }
        66% { transform: translateY(-${hoverHeight * 0.5}px) scale(1.02, 0.98) rotate(-2deg); }
        100% { transform: translateY(${config.size}px) scale(1.05, 0.95); }
      }
    `;
  } else {
    // 模式 2: 变速型 (快慢结合)
    keyframes = `
      @keyframes ${animationName} {
        0% { transform: translateY(${config.size}px) scale(1, 1); }
        20% { transform: translateY(-${travelDistance * 0.1}px) scale(1.1, 0.9); }
        40% { transform: translateY(-${travelDistance * 0.5}px) scale(0.7, 1.4); }
        80% { transform: translateY(-${travelDistance * 0.85}px) scale(1.1, 0.9); }
        100% { transform: translateY(-${travelDistance}px) scale(1, 1); }
      }
    `;
  }

  const speedFactor = isMotherBlob ? 0.2 : 0.4;
  const safeSpeed = Math.max(0.01, speed * speedFactor);
  const adjustedDuration = config.duration / safeSpeed;

  return (
    <>
      <style>
        {keyframes}
      </style>
      <circle
        cx={`${config.x}%`}
        cy="100%"
        r={config.size}
        fill="url(#waxGradient)"
        style={{
          animation: `${animationName} ${adjustedDuration}s ease-in-out infinite alternate`,
          animationDelay: `-${config.delay}s`, 
          opacity: config.opacity,
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }}
      />
    </>
  );
};

export default LavaLampBlob;