import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function uploadMapPlugin(): Plugin {
  return {
    name: 'upload-map-plugin',
    configureServer(server) {
      server.middlewares.use('/api/upload-map', (req, res) => {
        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const publicDir = path.resolve(__dirname, 'public');
            const assetsDir = path.resolve(__dirname, 'src', 'assets');
            const distDir = path.resolve(__dirname, 'dist');
            [publicDir, assetsDir, distDir].forEach(d => {
              if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            });
            fs.writeFileSync(path.resolve(publicDir, 'ban_do_nen.png'), buffer);
            fs.writeFileSync(path.resolve(assetsDir, 'ban_do_nen.png'), buffer);
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.resolve(distDir, 'ban_do_nen.png'), buffer);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, size: buffer.length }));
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), uploadMapPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
