import React from 'react'
import ReactDOM from 'react-dom/client'
import LavaLamp from './components/LavaLamp'
import './index.css'

// 👇👇👇 加了这句“喇叭” 👇👇👇
console.log('%c 🔥 熔岩灯插件已注入！', 'background: #222; color: #bada55; font-size: 20px');

const rootId = 'my-lava-lamp-extension-root';

if (!document.getElementById(rootId)) {
  const rootDiv = document.createElement('div');
  rootDiv.id = rootId;
  document.body.appendChild(rootDiv);

  ReactDOM.createRoot(rootDiv).render(
    <React.StrictMode>
      <LavaLamp />
    </React.StrictMode>
  );
}