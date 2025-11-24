
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LampConfig, LampColor, LampTheme, COLOR_PALETTES, getBrowserLanguage, TRANSLATIONS } from '../types';

interface ControlPanelProps {
  config: LampConfig;
  updateConfig: <K extends keyof LampConfig>(key: K, value: LampConfig[K]) => void;
  onMinimize: () => void;
  onClose: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, updateConfig, onMinimize, onClose }) => {
  // State is used ONLY for the resting position to persist across re-renders.
  // Intermediate dragging frames are handled via direct DOM manipulation.
  const [position, setPosition] = useState<{x: number, y: number} | null>(null);
  
  const dragRef = useRef<{ 
    isDragging: boolean, 
    startX: number, 
    startY: number, 
    initialLeft: number, 
    initialTop: number 
  }>({ 
    isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 
  });
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Language Detection
  const lang = useMemo(() => getBrowserLanguage(), []);
  const t = TRANSLATIONS[lang];

  // --- DRAGGING LOGIC (Optimized) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    
    // We grab the current visual coordinates directly from the DOM
    const currentLeft = rect.left;
    const currentTop = rect.top;

    dragRef.current.isDragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.initialLeft = currentLeft;
    dragRef.current.initialTop = currentTop;
    
    // If this is the first drag (moving from CSS right-aligned to absolute), 
    // set the initial state so React knows where it is conceptually.
    if (!position) {
        setPosition({ x: currentLeft, y: currentTop });
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging || !panelRef.current) return;
    
    // Calculate delta
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    const newX = dragRef.current.initialLeft + dx;
    const newY = dragRef.current.initialTop + dy;

    // --- CRITICAL OPTIMIZATION ---
    // Update the DOM style directly. This avoids triggering a React render 
    // and recalculating the component tree (and the expensive blur filter) on every pixel.
    panelRef.current.style.left = `${newX}px`;
    panelRef.current.style.top = `${newY}px`;
    panelRef.current.style.right = 'auto'; 
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Sync the final position back to React state only ONCE at the end.
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialLeft + dx,
      y: dragRef.current.initialTop + dy
    });
  };

  // --- THEMING LOGIC ---
  const isDark = config.theme === 'dark' || (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const activeColor = config.color === 'rainbow' ? '#ec4899' : COLOR_PALETTES[config.color].waxTop; 

  const themes: { id: LampTheme; label: string }[] = [
    { id: 'light', label: t.themeLight },
    { id: 'dark', label: t.themeDark },
    { id: 'auto', label: t.themeAuto },
  ];

  const colors: { id: LampColor; color: string; isRainbow?: boolean }[] = [
    { id: 'red', color: '#f43f5e' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'green', color: '#10b981' },
    { id: 'purple', color: '#a855f7' },
    // Rainbow Option
    { id: 'rainbow', color: 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)', isRainbow: true },
  ];

  return (
    <div 
      ref={panelRef}
      className={`fixed z-[9999] w-72 rounded-3xl shadow-2xl p-6 select-none
                 animate-in fade-in zoom-in duration-200 border transition-colors`}
      style={{
        left: position ? position.x : undefined,
        top: position ? position.y : '100px',
        right: position ? undefined : '100px',
        backgroundColor: isDark ? 'rgba(20, 20, 25, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        color: isDark ? '#f5f5f5' : '#1f2937',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}
      onMouseDown={(e) => e.stopPropagation()} 
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center mb-6 cursor-move group"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2" style={{ color: activeColor }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
          <h2 className="font-bold text-lg tracking-wider drop-shadow-sm">{t.title}</h2>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
            onClick={(e) => { e.stopPropagation(); updateConfig('isLocked', !config.isLocked); }}
            className={`p-2 rounded-lg transition-all`}
            style={{
              color: config.isLocked ? activeColor : (isDark ? '#9ca3af' : '#6b7280'),
              backgroundColor: config.isLocked ? `${activeColor}20` : 'transparent',
            }}
            title={config.isLocked ? t.locked : t.unlocked}
          >
            {config.isLocked ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-neutral-400 hover:bg-white/10' : 'text-neutral-500 hover:bg-black/5'}`}
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="mb-5">
        <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{t.theme}</label>
        <div className={`grid grid-cols-3 gap-2 p-1 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/40 border-neutral-200/50'}`}>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => updateConfig('theme', t.id)}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all`}
              style={{
                backgroundColor: config.theme === t.id ? (isDark ? 'rgba(255,255,255,0.15)' : 'white') : 'transparent',
                color: config.theme === t.id ? (isDark ? 'white' : 'black') : (isDark ? '#737373' : '#6b7280'),
                boxShadow: config.theme === t.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="mb-5">
        <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{t.color}</label>
        <div className="flex justify-between gap-2 px-1">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => updateConfig('color', c.id)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform shadow-md ${
                config.color === c.id ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ 
                background: c.color,
                boxShadow: config.color === c.id ? `0 0 0 2px ${isDark ? '#18181b' : '#ffffff'}, 0 0 0 4px ${c.isRainbow ? '#ec4899' : c.color}` : 'none'
              }}
            >
              {config.color === c.id && (
                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mb-5">
        <div className={`flex justify-between text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          <span>{t.size}</span>
          <span>{Math.round(config.size * 200)}%</span>
        </div>
        <input 
          type="range" 
          min="0.1" 
          max="0.9" 
          step="0.05"
          value={config.size}
          onChange={(e) => updateConfig('size', parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            accentColor: activeColor 
          }}
        />
      </div>

      {/* Speed */}
      <div className="mb-5">
        <div className={`flex justify-between text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          <span>{t.speed}</span>
          <span>{config.speed.toFixed(1)}x</span>
        </div>
        <input 
          type="range" 
          min="0.2" 
          max="3.0" 
          step="0.1"
          value={config.speed}
          onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            accentColor: activeColor 
          }}
        />
      </div>

      {/* Opacity Slider */}
      <div className="mb-5">
        <div className={`flex justify-between text-xs font-medium mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          <span>{t.opacity}</span>
          <span>{Math.round(config.splashOpacity * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0.1" 
          max="0.9" 
          step="0.1"
          value={config.splashOpacity}
          onChange={(e) => updateConfig('splashOpacity', parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            accentColor: activeColor 
          }}
        />
      </div>

      {/* Splash Light Toggle */}
      <div className="mb-6 flex justify-between items-center px-1">
        <span className={`text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{t.splash}</span>
        <button
          onClick={() => updateConfig('isSplashOn', !config.isSplashOn)}
          className={`w-10 h-5 rounded-full relative transition-colors duration-300 focus:outline-none ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
          style={{ backgroundColor: config.isSplashOn ? activeColor : undefined }}
        >
          <div 
            className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300`}
            style={{ left: config.isSplashOn ? 'calc(100% - 16px)' : '4px' }}
          />
        </button>
      </div>

      <button
        onClick={onMinimize}
        className={`w-full py-3 rounded-xl font-medium transition-colors mb-6 border`}
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          color: isDark ? 'white' : '#1f2937'
        }}
      >
        {t.minimize}
      </button>

      {/* Footer */}
      <div className={`text-center border-t pt-4 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
         <p className={`text-[10px] font-bold tracking-widest uppercase leading-tight ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {t.gift}
         </p>
         <p className={`text-[10px] font-bold tracking-widest uppercase leading-tight mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {t.copyright}
         </p>
      </div>
    </div>
  );
};

export default ControlPanel;
