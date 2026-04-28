import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  integrations: [vue(), mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeKatex,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
  vite: {
    optimizeDeps: {
      // open-loop-engine is a `link:` dep so its transitive deps don't show up in
      // package.json; pre-declare them so Vite pre-bundles on first start instead of
      // racing with on-demand requests when a new component imports the engine.
      include: ['break_eternity.js', 'eternal_notations'],
    },
  },
});
