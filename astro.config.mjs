// @ts-check
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://mechanicslab.org',
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/study') &&
        !page.includes('/login') &&
        !page.includes('/log') &&
        !page.includes('/topics') &&
        !page.includes('/history') &&
        page !== 'https://mechanicslab.org/',
    }),
  ],
  vite: {
    optimizeDeps: {
      exclude: ['@astrojs/preact', '@astrojs/preact/client.js', '@astrojs/preact/server.js'],
    },
  },
});
