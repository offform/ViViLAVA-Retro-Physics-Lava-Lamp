import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    // 🔥【关键修改1】关闭 Source Map
    // 这样别人在控制台按 F12 只能看到乱码一样的压缩代码，看不到你的 .tsx 源码
    sourcemap: false,

    // 🔥【关键修改2】确保开启压缩混淆
    // 这会把长变量名改成 a, b, c，去掉空格和注释，增加阅读难度
    minify: true, 

    cssCodeSplit: false,
    rollupOptions: {
      input: {
        // 指向根目录下的 main.tsx
        content: 'main.tsx' 
      },
      output: {
        format: 'iife', // 立即执行函数，非常适合插件环境，防止变量污染全局
        name: 'LavaLampExtension',
        entryFileNames: 'assets/content.js',
        assetFileNames: 'assets/content.[ext]',
      },
    },
  },
})