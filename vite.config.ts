import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
        noExternal: ['svelte-icons']
    },
    server: {
        port: 3000,
        allowedHosts: [
            'chat.waiyip.life',
        ]
    }
});
