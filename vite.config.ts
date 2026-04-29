import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 57102,
        host: true,
        proxy: {
            '/api': 'http://localhost:3000',
        }
    }
})
