import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BlobConfig, LampConfig, COLOR_PALETTES, METAL_THEMES } from '../types';
import LavaLampBlob from './LavaLampBlob';
import ControlPanel from './ControlPanel';
import IgnitionGame from './IgnitionGame';
import { saveConfig, loadConfig } from '../utils/storage';

// --- 数学工具 ---
const getIntersection = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return { x: x2, y: y2 }; 
  const intersectX = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const intersectY = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return { x: intersectX, y: intersectY };
};

const LavaLamp: React.FC = () => {
  const [blobs, setBlobs] = useState<BlobConfig[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [rotation, setRotation] = useState(0);

  const [config, setConfig] = useState<LampConfig>({
    theme: 'dark',
    color: 'red',
    size: 0.5, 
    speed: 1,
    splashOpacity: 0.9, 
    isLocked: false,
    isOn: true,
    isMinimized: false,
    isSplashOn: true
  });

  const [position, setPosition] = useState({ x: window.innerWidth - 200, y: window.innerHeight - 100 });

  // --- 1. LOAD CONFIG ---
  useEffect(() => {
    const init = async () => {
      try {
        const savedConfig = await loadConfig();
        if (savedConfig) setConfig(prev => ({ ...prev, ...savedConfig }));
        
        // @ts-ignore
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // @ts-ignore
          chrome.storage.local.get(['lampPosition'], (res) => { 
              if (res.lampPosition && !isNaN(res.lampPosition.x)) {
                  setPosition(res.lampPosition);
              }
              setHasLoaded(true);
          });
        } else {
            setHasLoaded(true);
        }
      } catch (e) {
        setHasLoaded(true);
      }
    };
    init();
    setTimeout(() => setIsReady(true), 200);
  }, []);

  // --- 2. SAVE CONFIG ---
  useEffect(() => {
    if (!hasLoaded) return;
    saveConfig(config);
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.storage) {
        // @ts-ignore
        chrome.storage.local.set({ lampPosition: position });
    }
  }, [config, position, hasLoaded]);

  const updateConfig = <K extends keyof LampConfig>(key: K, value: LampConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleMinimize = () => {
    updateConfig('isMinimized', true);
    setShowPanel(false);
  };

  const handleRevive = () => {
    updateConfig('isMinimized', false);
  };

  // --- 交互逻辑 ---
  const dragRef = useRef<{ 
    isDragging: boolean, 
    startX: number, 
    startY: number, 
    initialX: number, 
    initialY: number,
    grabRatio: number 
  }>({ 
    isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, grabRatio: 0.5 
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.menu-container')) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const height = rect.height;
    // 防止除以0
    const ratio = height > 0 ? Math.min(Math.max(clickY / height, 0), 1) : 0.5;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      grabRatio: ratio
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    if (config.isLocked) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    let newX = dragRef.current.initialX + dx;
    let newY = dragRef.current.initialY + dy;

    const PADDING = 50;
    const maxX = window.innerWidth - PADDING;
    const maxY = window.innerHeight;
    
    if (newX < PADDING) newX = PADDING;
    if (newX > maxX) newX = maxX;
    if (newY < PADDING) newY = PADDING;
    if (newY > maxY) newY = maxY;

    setPosition({ x: newX, y: newY });

    const velocity = e.movementX; 
    const leverage = (0.5 - dragRef.current.grabRatio) * 4.0;
    const targetRotation = velocity * leverage; 
    
    const maxTilt = 12;
    const clampedRotation = Math.max(-maxTilt, Math.min(maxTilt, targetRotation));
    
    setRotation(clampedRotation);
  };

  const handleMouseUp = (e: MouseEvent) => {
    const movedDist = Math.abs(e.clientX - dragRef.current.startX) + Math.abs(e.clientY - dragRef.current.startY);
    if (movedDist < 5 && !config.isMinimized) {
        if (!(e.target as HTMLElement).closest('.menu-container')) {
             setShowPanel(prev => !prev);
        }
    }
    dragRef.current.isDragging = false;
    setRotation(0); 
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- 视觉逻辑 ---
  useEffect(() => {
    const newBlobs: BlobConfig[] = [];
    for (let i = 0; i < 12; i++) {
      newBlobs.push({
        id: i,
        x: 35 + Math.random() * 30, 
        size: 10 + Math.random() * 18, 
        duration: 8 + Math.random() * 15, 
        delay: Math.random() * 20,
        opacity: 0.9 + Math.random() * 0.1
      });
    }
    newBlobs.push({ id: 99, x: 50, size: 50, duration: 6, delay: 0, opacity: 1 });
    setBlobs(newBlobs);
  }, []);

  const currentPalette = COLOR_PALETTES[config.color] || COLOR_PALETTES.red;
  const isDark = config.theme === 'dark' || (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const currentMetal = isDark ? METAL_THEMES.dark : METAL_THEMES.light;
  const isRainbow = config.color === 'rainbow';

  const splashStyle = isRainbow ? {
     background: `radial-gradient(circle, #ffb3ba 0%, #ffdfba 40%, transparent 70%)`,
     filter: 'blur(40px)',
     animation: 'hueRotate 10s linear infinite', 
     opacity: 0.3 
  } : {
     background: `radial-gradient(circle, ${currentPalette.liquidBottom}CC 0%, ${currentPalette.liquidTop}33 50%, transparent 70%)`,
     filter: 'blur(40px)',
     opacity: 0.6 
  };

  const effectiveBodyOpacity = 0.325 + (config.splashOpacity * 0.75);

  // --- 几何参数 ---
  const VIEWBOX_WIDTH = 240; const VIEWBOX_HEIGHT = 600; const CENTER_X = 120;
  const CAP_TOP_W = 60; const CAP_BOT_W = 80; const BASE_TOP_W = 140; const BASE_WAIST_W = 80; const BASE_FLOOR_W = 140;
  const UNIT = 35; const GLASS_H = 7 * UNIT; const CAP_H = 2 * UNIT; const BASE_H = 5 * UNIT;
  const START_Y = 50; const CAP_TOP_Y = START_Y; const CAP_BOT_Y = CAP_TOP_Y + CAP_H; const BASE_TOP_Y = CAP_BOT_Y + GLASS_H;
  const BASE_WAIST_Y = BASE_TOP_Y + BASE_H * 0.45; const BASE_FLOOR_Y = BASE_TOP_Y + BASE_H;
  const RING_TOP_Y = BASE_WAIST_Y - 6; 

  const capTopL = CENTER_X - CAP_TOP_W / 2; const capTopR = CENTER_X + CAP_TOP_W / 2;
  const capBotL = CENTER_X - CAP_BOT_W / 2; const capBotR = CENTER_X + CAP_BOT_W / 2;
  const baseTopL = CENTER_X - BASE_TOP_W / 2; const baseTopR = CENTER_X + BASE_TOP_W / 2;
  const baseWaistL = CENTER_X - BASE_WAIST_W / 2; const baseWaistR = CENTER_X + BASE_WAIST_W / 2;
  const baseFloorL = CENTER_X - BASE_FLOOR_W / 2; const baseFloorR = CENTER_X + BASE_FLOOR_W / 2;
  const intL = useMemo(() => getIntersection(capTopL, CAP_TOP_Y, capBotL, CAP_BOT_Y, baseWaistL, BASE_WAIST_Y, baseTopL, BASE_TOP_Y), []);
  const intR = useMemo(() => getIntersection(capTopR, CAP_TOP_Y, capBotR, CAP_BOT_Y, baseWaistR, BASE_WAIST_Y, baseTopR, BASE_TOP_Y), []);
  const cpCapTop = CAP_TOP_Y - 12; const cpCapBot = CAP_BOT_Y - 12; const cpBaseTop = BASE_TOP_Y + 16; const cpBaseWaist = BASE_WAIST_Y + 8; 
  
  const CAP_PATH = `M ${capTopL},${CAP_TOP_Y} Q ${CENTER_X},${cpCapTop} ${capTopR},${CAP_TOP_Y} L ${capBotR},${CAP_BOT_Y} Q ${CENTER_X},${cpCapBot} ${capBotL},${CAP_BOT_Y} L ${capTopL},${CAP_TOP_Y} Z`;
  const GLASS_PATH = `M ${capBotL},${CAP_BOT_Y} L ${capBotL + (intL.x - capBotL) * 0.8},${CAP_BOT_Y + (intL.y - CAP_BOT_Y) * 0.8} Q ${intL.x},${intL.y} ${baseTopL},${BASE_TOP_Y} Q ${CENTER_X},${cpBaseTop} ${baseTopR},${BASE_TOP_Y} Q ${intR.x},${intR.y} ${capBotR + (intR.x - capBotR) * 0.8},${CAP_BOT_Y + (intR.y - CAP_BOT_Y) * 0.8} L ${capBotR},${CAP_BOT_Y} Q ${CENTER_X},${cpCapBot} ${capBotL},${CAP_BOT_Y} Z`;
  const BASE_CUP_PATH = `M ${baseTopL},${BASE_TOP_Y} Q ${CENTER_X},${cpBaseTop} ${baseTopR},${BASE_TOP_Y} L ${baseWaistR},${RING_TOP_Y} Q ${CENTER_X},${cpBaseWaist} ${baseWaistL},${RING_TOP_Y} L ${baseTopL},${BASE_TOP_Y} Z`;
  const BASE_CONE_PATH = `M ${baseWaistL},${RING_TOP_Y} Q ${CENTER_X},${cpBaseWaist} ${baseWaistR},${RING_TOP_Y} L ${baseFloorR},${BASE_FLOOR_Y} C ${baseFloorR},${BASE_FLOOR_Y + 36} ${baseFloorL},${BASE_FLOOR_Y + 36} ${baseFloorL},${BASE_FLOOR_Y} L ${baseWaistL},${RING_TOP_Y} Z`;
  const CAP_HL_MAIN = `M ${capTopL + 10},${CAP_TOP_Y + 4} Q ${CENTER_X},${cpCapTop + 2} ${capTopL + 24},${CAP_TOP_Y + 4} L ${capBotL + 30},${CAP_BOT_Y - 4} Q ${CENTER_X},${cpCapBot - 2} ${capBotL + 14},${CAP_BOT_Y - 4} Z`;
  const CAP_HL_RIM = `M ${capTopR - 6},${CAP_TOP_Y + 3} L ${capBotR - 8},${CAP_BOT_Y - 3} L ${capBotR - 2},${CAP_BOT_Y - 3} L ${capTopR - 1},${CAP_TOP_Y + 3} Z`;
  const BASE_CUP_HL_MAIN = `M ${baseTopL + 18},${BASE_TOP_Y + 8} Q ${CENTER_X},${cpBaseTop + 4} ${baseTopL + 42},${BASE_TOP_Y + 8} L ${baseWaistL + 24},${RING_TOP_Y - 3} Q ${CENTER_X},${cpBaseWaist - 2} ${baseWaistL + 10},${RING_TOP_Y - 3} Z`;
  const BASE_CUP_HL_RIM = `M ${baseTopR - 8},${BASE_TOP_Y + 5} L ${baseWaistR - 5},${RING_TOP_Y - 2} L ${baseWaistR - 1},${RING_TOP_Y - 2} L ${baseTopR - 1},${BASE_TOP_Y + 5} Z`;
  const BASE_CONE_HL_MAIN = `M ${baseWaistL + 10},${RING_TOP_Y + 4} Q ${CENTER_X},${cpBaseWaist + 4} ${baseWaistL + 24},${RING_TOP_Y + 4} L ${baseFloorL + 40},${BASE_FLOOR_Y - 8} C ${baseFloorL + 40},${BASE_FLOOR_Y + 10} ${baseFloorL + 16},${BASE_FLOOR_Y + 10} ${baseFloorL + 16},${BASE_FLOOR_Y - 8} Z`;
  const BASE_CONE_HL_RIM = `M ${baseWaistR - 5},${RING_TOP_Y + 2} L ${baseFloorR - 8},${BASE_FLOOR_Y - 4} L ${baseFloorR - 2},${BASE_FLOOR_Y - 4} L ${baseWaistR - 1},${RING_TOP_Y + 2} Z`;

  return (
    <div className="fixed inset-0 z-[2147483647] pointer-events-none overflow-hidden">
      
      <style>{`
        @keyframes hueRotate { 
          from { filter: blur(40px) hue-rotate(0deg); } 
          to { filter: blur(40px) hue-rotate(360deg); } 
        }
        @keyframes popFromBottom {
          0% { opacity: 0; transform: scale(0.2); }
          70% { opacity: 1; transform: scale(0.65); } 
          100% { opacity: 1; transform: scale(0.6); } 
        }
      `}</style>

      {showPanel && !config.isMinimized && (
        <div className="pointer-events-auto">
          <ControlPanel 
            config={config} 
            updateConfig={updateConfig}
            onMinimize={handleMinimize}
            onClose={() => setShowPanel(false)} 
          />
        </div>
      )}

      {/* 核心容器 */}
      <div 
        // 🔥 修复关键：移除了这里的 pointer-events-auto
        // 这样这个大容器本身是“透明”的，鼠标点上去会穿透
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -100%) scale(${config.isMinimized ? 1 : config.size}) rotate(${rotation}deg)`, 
          transformOrigin: 'bottom center', 
          transition: (isReady && !dragRef.current.isDragging) ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.2), opacity 0.5s' : 'none',
          opacity: isReady ? 1 : 0
        }}
        // 这里保留 onMouseDown，因为事件冒泡机制
        // 当你点击子元素（火焰）时，事件会冒泡上来被这里捕获，开始拖动
        onMouseDown={handleMouseDown}
      >
        
        {/* Minimized State (Ignition Game) */}
        {config.isMinimized ? (
          <div 
            // 🔥 显式声明父容器不响应鼠标
            className="flex items-end justify-center pointer-events-none"
            style={{
              width: `${VIEWBOX_WIDTH}px`,
              height: `${VIEWBOX_HEIGHT}px`,
              paddingBottom: '70px',
              animation: 'popFromBottom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              transformOrigin: 'bottom center'
            }}
          >
            {/* 🔥 只有这一个子元素是可点击、可拖动的 */}
            <div 
              className={`pointer-events-auto ${config.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <IgnitionGame onRevive={handleRevive} />
            </div>
          </div>
        ) : (
          /* Normal State (Lamp) */
          <div 
            className={`relative pointer-events-auto ${config.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
          >
            <div style={{ width: `${VIEWBOX_WIDTH}px`, height: `${VIEWBOX_HEIGHT}px` }} className="drop-shadow-2xl select-none">
              
              {!config.isMinimized && config.isSplashOn && (
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full -z-10 pointer-events-none transition-all duration-1000 ${config.isOn ? 'opacity-100' : 'opacity-0'}`}
                  style={splashStyle}
                />
              )}

              <svg 
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} 
                className="w-full h-full overflow-visible"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" /><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter>
                  
                  <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={isDark ? '#0f172a' : '#3f3f46'} />
                    <stop offset="15%" stopColor={isDark ? '#334155' : '#71717a'} />
                    <stop offset="25%" stopColor={isDark ? '#1e293b' : '#52525b'} />
                    <stop offset="45%" stopColor={isDark ? '#64748b' : '#d4d4d8'} /> 
                    <stop offset="60%" stopColor={isDark ? '#334155' : '#a1a1aa'} />
                    <stop offset="85%" stopColor={isDark ? '#1e293b' : '#52525b'} />
                    <stop offset="100%" stopColor={isDark ? '#0f172a' : '#27272a'} />
                  </linearGradient>
                  
                  {isRainbow ? (
                    <>
                       <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffb3ba"><animate attributeName="stop-color" values="#ffb3ba;#ffffba;#baffc9;#bae1ff;#eecbff;#ffb3ba" dur="10s" repeatCount="indefinite" calcMode="linear" /></stop>
                          <stop offset="100%" stopColor="#ffdfba"><animate attributeName="stop-color" values="#ffdfba;#ffffba;#baffc9;#bae1ff;#eecbff;#ffb3ba;#ffdfba" dur="10s" repeatCount="indefinite" calcMode="linear" /></stop>
                       </linearGradient>
                       <linearGradient id="waxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ff0000"><animate attributeName="stop-color" values="#ff0000;#ffff00;#00ff00;#00ffff;#0000ff;#ff00ff;#ff0000" dur="10s" repeatCount="indefinite" calcMode="linear" /></stop>
                          <stop offset="100%" stopColor="#cc0000"><animate attributeName="stop-color" values="#cc0000;#cccc00;#00cc00;#00cccc;#0000cc;#cc00cc;#cc0000" dur="10s" repeatCount="indefinite" calcMode="linear" /></stop>
                       </linearGradient>
                    </>
                  ) : (
                    <>
                      <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={currentPalette.liquidTop} stopOpacity="0.9" className="transition-colors duration-500" />
                        <stop offset="100%" stopColor={currentPalette.liquidBottom} stopOpacity="0.95" className="transition-colors duration-500" />
                      </linearGradient>
                      <linearGradient id="waxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={currentPalette.waxTop} className="transition-colors duration-500" />
                        <stop offset="100%" stopColor={currentPalette.waxBottom} className="transition-colors duration-500" />
                      </linearGradient>
                    </>
                  )}

                  <linearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="white" stopOpacity="0.1"/><stop offset="20%" stopColor="white" stopOpacity="0.4"/><stop offset="40%" stopColor="white" stopOpacity="0"/><stop offset="100%" stopColor="white" stopOpacity="0.2"/></linearGradient>
                  <clipPath id="bottleClip"><path d={GLASS_PATH} /></clipPath>
                </defs>

                <path d={CAP_PATH} fill="url(#metalGradient)" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
                
                <path d={CAP_HL_MAIN} fill="white" fillOpacity="0.2" filter="blur(1px)" />
                <path d={CAP_HL_RIM} fill="white" fillOpacity="0.15" filter="blur(0.5px)" />
                
                <g clipPath="url(#bottleClip)" style={{ opacity: effectiveBodyOpacity }}>
                  <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#liquidGradient)" className={`transition-opacity duration-1000 ${config.isOn ? 'opacity-100' : 'opacity-30'}`} />
                  {config.isOn && (
                    <g filter="url(#goo)" className="opacity-90" style={{ transform: `rotate(${-rotation * 0.7}deg)`, transformOrigin: 'center' }}>
                      {blobs.map((blob) => <LavaLampBlob key={blob.id} config={blob} containerHeight={VIEWBOX_HEIGHT} speed={config.speed} />)}
                    </g>
                  )}
                  <path d={GLASS_PATH} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="4" />
                </g>
                
                <g clipPath="url(#bottleClip)" className="pointer-events-none">
                  <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#glassGlare)" />
                  <path d={`M ${capBotL+8},${CAP_BOT_Y+10} L ${capBotL + (intL.x - capBotL) * 0.9 + 8},${CAP_BOT_Y + (intL.y - CAP_BOT_Y) * 0.9}`} stroke="white" strokeWidth="3" strokeOpacity="0.3" fill="none" strokeLinecap="round" />
                  <path d={`M ${capBotR-10},${CAP_BOT_Y+10} L ${capBotR + (intR.x - capBotR) * 0.9 - 10},${CAP_BOT_Y + (intR.y - CAP_BOT_Y) * 0.9}`} stroke="white" strokeWidth="2" strokeOpacity="0.15" fill="none" strokeLinecap="round" />
                </g>

                <path d={BASE_CUP_PATH} fill="url(#metalGradient)" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
                <path d={BASE_CUP_HL_MAIN} fill="white" fillOpacity="0.2" filter="blur(1px)" />
                <path d={BASE_CUP_HL_RIM} fill="white" fillOpacity="0.15" filter="blur(0.5px)" />
                
                <path d={BASE_CONE_PATH} fill="url(#metalGradient)" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
                <path d={BASE_CONE_HL_MAIN} fill="white" fillOpacity="0.2" filter="blur(1px)" />
                <path d={BASE_CONE_HL_RIM} fill="white" fillOpacity="0.15" filter="blur(0.5px)" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LavaLamp;