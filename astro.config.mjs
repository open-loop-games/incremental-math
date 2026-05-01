import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';

const base = process.env.BASE_URL ?? '/';

// Markdown links are authored as bare `/path` and `/path#anchor`; this
// rewrites them to include the configured base so subdirectory deploys work.
function rehypePrefixInternalLinks() {
  const prefix = base.replace(/\/$/, '');
  if (!prefix) return () => {};
  const walk = (node) => {
    if (node.tagName === 'a') {
      const href = node.properties?.href;
      if (
        typeof href === 'string' &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith(prefix + '/') &&
        href !== prefix
      ) {
        node.properties.href = prefix + href;
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  base,
  integrations: [vue(), mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeKatex,
      rehypePrefixInternalLinks,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
});
