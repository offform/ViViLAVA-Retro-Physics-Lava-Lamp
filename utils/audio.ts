// utils/audio.ts

export const playSound = (soundName: 'strike' | 'ignite') => {
  try {
    let url = '';
    
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      // 插件环境：从插件包内获取资源
      // @ts-ignore
      url = chrome.runtime.getURL(`sounds/${soundName}.wav`);
    } else {
      // 本地开发环境：假设 public/sounds 存在
      url = `/sounds/${soundName}.wav`;
    }

    const audio = new Audio(url);
    audio.volume = 0.5; // 音量设置在 50%，避免吓到用户
    audio.play().catch(e => {
      // 忽略自动播放限制的报错
      console.log('Audio play prevented:', e);
    });
  } catch (error) {
    console.warn('Sound system error:', error);
  }
};