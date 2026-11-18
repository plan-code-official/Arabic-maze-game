import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { analyzer } from "vite-bundle-analyzer";
import { imagetools } from "vite-imagetools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    imagetools({
      defaultDirectives: (url) => {
        if (url.pathname.endsWith('.png')) {
          const isRobotSprite = /robot(-up|-down|-side)?\.png$/i.test(url.pathname);
          return new URLSearchParams({
            format: 'webp',
            quality: '82',
            w: isRobotSprite ? '256' : '1280',
            withoutEnlargement: 'true',
          });
        }
        return new URLSearchParams();
      },
    }),
    analyzer(),
  ],
})
