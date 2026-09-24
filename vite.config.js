import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          firebaseApp: ['firebase/app'],
          firebaseAuth: ['firebase/auth'],
          firebaseFirestore: ['firebase/firestore'],
          firebaseStorage: ['firebase/storage'],
          ui: ['lucide-react'],
          react: ['react', 'react-dom']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
