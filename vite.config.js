import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Virtual module `virtual:project-images` that lists every image inside
// public/assets at build/dev time, so the admin can pick a photo for braids,
// products and perfumes without typing a path by hand.
const PROJECT_IMAGES_ID = 'virtual:project-images';
const PROJECT_IMAGES_RESOLVED = '\0virtual:project-images';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];

const collectImages = (dir, publicDir) => {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      found.push(...collectImages(fullPath, publicDir));
    } else if (IMAGE_EXTENSIONS.some(ext => entry.toLowerCase().endsWith(ext))) {
      found.push('/' + relative(publicDir, fullPath).split(sep).join('/'));
    }
  }
  return found.sort();
};

const projectImagesPlugin = {
  name: 'project-images',
  resolveId(id) {
    if (id === PROJECT_IMAGES_ID) return PROJECT_IMAGES_RESOLVED;
  },
  load(id) {
    if (id === PROJECT_IMAGES_RESOLVED) {
      const publicDir = join(process.cwd(), 'public');
      const assetsDir = join(publicDir, 'assets');
      let images = [];
      if (statSync(assetsDir, { throwIfNoEntry: false })?.isDirectory()) {
        images = collectImages(assetsDir, publicDir);
      }
      if (this && this.addWatchFile) this.addWatchFile(assetsDir);
      return `export default ${JSON.stringify(images)};`;
    }
  }
};

export default defineConfig({
  plugins: [react(), projectImagesPlugin],
  server: {
    port: 3000,
    open: true
  }
});
