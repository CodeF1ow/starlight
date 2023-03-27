import type { AstroIntegration, AstroUserConfig, ViteUserConfig } from 'astro';
import { spawn } from 'node:child_process';
import { basename, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StarbookConfig } from './types';

const virtualModuleId = 'virtual:starbook/user-config';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

export default function StarbookIntegration(
  opts: StarbookConfig
): AstroIntegration {
  return {
    name: 'starbook',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        injectRoute({
          pattern: '[...slug]',
          entryPoint: 'starbook/index.astro',
        });
        const newConfig: AstroUserConfig = {
          vite: {
            plugins: [vitePluginStarBookUserConfig(opts)],
          },
        };
        updateConfig(newConfig);
      },

      'astro:build:done': ({ dir }) => {
        const targetDir = fileURLToPath(dir);
        const cwd = dirname(fileURLToPath(import.meta.url));
        const relativeDir = relative(cwd, targetDir);
        return new Promise<void>((resolve) => {
          spawn('npx', ['-y', 'pagefind', '--source', relativeDir], {
            stdio: 'inherit',
            shell: true,
            cwd,
          }).on('close', () => resolve());
        });
      },
    },
  };
}

/** Expose the StarBook user config object via a virtual module. */
function vitePluginStarBookUserConfig(
  opts: StarbookConfig
): NonNullable<ViteUserConfig['plugins']>[number] {
  return {
    name: 'vite-plugin-starbook-user-config',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
    },
    load(id) {
      if (id === resolvedVirtualModuleId)
        return `export default ${JSON.stringify(opts)}`;
    },
  };
}