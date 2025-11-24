import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom'; 
import { getBrowserLanguage, TRANSLATIONS } from '../types';
import { playSound } from '../utils/audio'; 

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface IgnitionGameProps {
  onRevive: () => void;
}

const IgnitionGame: React.FC<IgnitionGameProps> = ({ onRevive }) => {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  const [comboCount, setComboCount] = useState(0); 
  const [cooldown, setCooldown] = useState(0);     
  const [flash, setFlash] = useState(0);           
  
  const requestRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null); 

  const lang = useMemo(() => getBrowserLanguage(), []);
  const t = TRANSLATIONS[lang];

  // 动画循环
  const animateLoop = () => {
    setSparks(prevSparks => 
      prevSparks
        .map(spark => ({
          ...spark,
          x: spark.x + spark.vx,
          y: spark.y + spark.vy,
          vy: spark.vy - 0.15, 
          vx: spark.vx * 0.92, 
          life: spark.life - 0.025 
        }))
        .filter(spark => spark.life > 0)
    );

    setFlash(prev => {
      if (prev <= 0) return 0;
      return Math.max(0, prev - 0.1); 
    });

    requestRef.current = requestAnimationFrame(animateLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  // 衰减机制
  useEffect(() => {
    if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    if (comboCount > 0 && comboCount < 3) {
      decayTimerRef.current = setTimeout(() => {
        setComboCount(0); 
      }, 2500);
    }
    return () => {
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    };
  }, [comboCount]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(0);
        setComboCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setMousePos(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (cooldown > 0 || !containerRef.current) return;

    playSound('strike');
    setFlash(1.0);

    const nextCombo = comboCount + 1;
    setComboCount(nextCombo);

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height * 0.85; 
    const scale = width / 200; 

    const newSparks: Spark[] = [];
    const sparkCount = 15 + (nextCombo * 10); 
    
    for (let i = 0; i < sparkCount; i++) {
      const isLeft = Math.random() > 0.5;
      const sideMultiplier = isLeft ? -1 : 1;
      
      newSparks.push({
        id: Math.random(),
        x: centerX + (sideMultiplier * (20 * scale + Math.random() * 15 * scale)),
        y: centerY + (Math.random() * 10 * scale - 5 * scale),
        vx: sideMultiplier * (Math.random() * 6 * scale + 2 * scale),
        vy: -(Math.random() * 6 * scale + 4 * scale),
        life: 1.0,
        size: (Math.random() * 4 + 2) * scale, 
        color: Math.random() > 0.4 ? '#fff7ed' : '#facc15'
      });
    }
    setSparks(prev => [...prev, ...newSparks]);

    if (nextCombo >= 3) {
      playSound('ignite');
      onRevive();
    }
  };

  return (
    <>
      <div 
        ref={containerRef}
        className={`relative w-[18vmin] h-[18vmin] max-w-[200px] max-h-[200px] min-w-[100px] min-h-[100px] flex items-center justify-center select-none transition-transform duration-100 active:scale-95 rounded-full ${isHovering ? 'cursor-none' : 'cursor-default'}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <style>{`
          @keyframes floatHalo { 
            0%, 100% { transform: translateY(0px) rotateX(70deg); } 
            50% { transform: translateY(-5px) rotateX(70deg); } 
          }
          @keyframes shimmerText {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `}</style>

        {/* 天使光圈 */}
        <div 
          className="absolute -top-8 w-12 h-12 rounded-full border-[3px] border-yellow-200 opacity-80 pointer-events-none z-20"
          style={{
            boxShadow: '0 0 15px #fde047, inset 0 0 5px #fde047',
            animation: 'floatHalo 3s ease-in-out infinite'
          }}
        />

        {/* 火焰容器 */}
        <div 
          className="w-full h-full flex items-center justify-center transition-all duration-300 ease-out origin-bottom"
          style={{
            transform: `scale(${0.8 + (comboCount * 0.2) + (flash * 0.1)})`,
            filter: `brightness(${0.5 + (comboCount * 0.25) + (flash * 2.0)}) saturate(${0.8 + flash * 0.4}) drop-shadow(0 0 ${10 + flash * 40}px rgba(245, 89, 32, ${0.2 + flash * 0.8}))`,
            opacity: cooldown > 0 ? 0.3 : 1
          }}
        >
           <div className={`w-full h-full`}>
              <svg width="100%" height="100%" viewBox="0 0 100 140" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
                <ellipse cx="50" cy="135" rx="30" ry="5" fill="rgba(0,0,0,0.3)" />
                <path fill="#f55920" d="M 50 130 Q 15 130 10 90 Q 5 70 20 55 Q 30 45 30 65 Q 35 75 40 55 Q 50 10 60 55 Q 65 75 70 65 Q 70 45 80 55 Q 95 70 90 90 Q 85 130 50 130 Z">
                  <animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M 50 130 Q 15 130 10 90 Q 5 70 20 55 Q 30 45 30 65 Q 35 75 40 55 Q 50 10 60 55 Q 65 75 70 65 Q 70 45 80 55 Q 95 70 90 90 Q 85 130 50 130 Z;M 50 130 Q 18 130 14 92 Q 8 75 25 60 Q 35 50 34 70 Q 38 80 45 50 Q 55 5 65 50 Q 68 70 75 60 Q 78 50 85 60 Q 92 75 86 92 Q 82 130 50 130 Z;M 50 130 Q 15 130 10 90 Q 5 70 20 55 Q 30 45 30 65 Q 35 75 40 55 Q 50 10 60 55 Q 65 75 70 65 Q 70 45 80 55 Q 95 70 90 90 Q 85 130 50 130 Z"/>
                </path>
                <path fill="#f98c25" d="M 50 125 Q 32 125 32 95 Q 32 65 50 45 Q 68 65 68 95 Q 68 125 50 125 Z" style={{ transformOrigin: '50% 125px' }}>
                   <animate attributeName="d" dur="1.5s" repeatCount="indefinite" values="M 50 125 Q 32 125 32 95 Q 32 65 50 45 Q 68 65 68 95 Q 68 125 50 125 Z;M 50 125 Q 34 125 34 95 Q 34 68 50 40 Q 66 68 66 95 Q 66 125 50 125 Z;M 50 125 Q 32 125 32 95 Q 32 65 50 45 Q 68 65 68 95 Q 68 125 50 125 Z"/>
                </path>
                <path fill="#fef200" d="M 50 120 Q 40 120 40 100 Q 40 85 50 70 Q 60 85 60 100 Q 60 120 50 120 Z">
                   <animate attributeName="d" dur="1.5s" repeatCount="indefinite" values="M 50 120 Q 40 120 40 100 Q 40 85 50 70 Q 60 85 60 100 Q 60 120 50 120 Z;M 50 120 Q 42 120 42 102 Q 42 87 50 75 Q 58 87 58 102 Q 58 120 50 120 Z;M 50 120 Q 40 120 40 100 Q 40 85 50 70 Q 60 85 60 100 Q 60 120 50 120 Z"/>
                </path>
              </svg>
           </div>
        </div>
        
        {/* 底部 UI */}
        <div className="absolute -bottom-14 w-full flex flex-col items-center gap-1 pointer-events-none">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full border border-neutral-400 transition-all duration-300 
                  ${comboCount > i ? 'bg-orange-500 border-orange-500 shadow-[0_0_8px_#f97316] scale-125' : 'bg-transparent opacity-30'}
                `}
              />
            ))}
          </div>
          {cooldown === 0 && (
            <div 
              className={`text-[10px] font-black tracking-widest mt-2 uppercase
                ${comboCount > 0 ? 'opacity-100' : 'opacity-60'}
              `}
              style={{
                background: 'linear-gradient(to right, #737373 0%, #ffffff 50%, #737373 100%)',
                backgroundSize: '200% auto',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: 'shimmerText 3s linear infinite'
              }}
            >
              {comboCount === 0 ? t.strike : (comboCount === 2 ? "ONE MORE!" : "STRIKE!")}
            </div>
          )}
          {cooldown > 0 && (
             <div className="text-[10px] font-mono tracking-widest mt-2 text-neutral-500">{t.waiting}</div>
          )}
        </div>

        {/* 粒子 */}
        {sparks.map(spark => (
          <div
            key={spark.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: spark.x,
              top: spark.y,
              width: spark.size + 'px',
              height: spark.size + 'px',
              backgroundColor: spark.color,
              opacity: spark.life,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${spark.size * 3}px ${spark.color}`,
              mixBlendMode: 'screen'
            }}
          />
        ))}
      </div>

      {/* 
          🔥 修复核心：将火柴层级提升至 MAX_INT (2147483647)
          这样它就能和 LavaLamp 容器平起平坐，
          并且因为它是通过 Portal 渲染到 body 最后的，所以它会覆盖在最上层。
      */}
      {isHovering && mousePos && cooldown === 0 && createPortal(
        <div 
          className="fixed pointer-events-none z-[2147483647]" 
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: `rotate(45deg) ${flash > 0.5 ? 'translate(2px, 2px)' : ''}`, 
            transformOrigin: '0 0', 
            transition: 'transform 0.05s ease-out' 
          }}
        >
           <div className="w-3 h-4 bg-red-800 rounded-full absolute" style={{ top: '-6px', left: '-6px' }}>
              <div className="absolute bottom-0 right-0 w-full h-1/2 bg-black/30 rounded-full"></div>
           </div>
           <div className="w-16 h-1.5 bg-amber-900 rounded-sm shadow-sm absolute" style={{ top: '0px', left: '0px' }}></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default IgnitionGame;