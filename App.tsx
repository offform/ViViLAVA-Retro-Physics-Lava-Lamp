
import React from 'react';
import LavaLamp from './components/LavaLamp';

const App: React.FC = () => {
  return (
    <div className="w-full min-h-screen relative bg-neutral-900 flex items-center justify-center overflow-hidden">
      {/* Background Text for Transparency Testing */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <h1 className="text-[15vw] font-black text-neutral-800 tracking-tighter opacity-50">
          LAVA<br/>LAMP
        </h1>
      </div>
      
      <LavaLamp />
    </div>
  );
};

export default App;
