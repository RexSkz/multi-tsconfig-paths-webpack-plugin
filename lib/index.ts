import fs from 'fs';
import path from 'path';
import type { Resolver } from 'webpack';
import { sync } from 'glob';
import { getTsconfig, createPathsMatcher, type TsConfigResult } from 'get-tsconfig';

import { getNormalizedPath } from './utils';

export interface Options {
  glob: string;
  extensions: string[];
}

const pluginName = 'MultiTsconfigPathsWebpackPlugin';

const defaultOptions: Options = {
  glob: './**/tsconfig.json',
  extensions: ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'],
};

class MultiTsconfigPathsWebpackPlugin {
  private opts: Options = defaultOptions;
  private tsconfigs: Record<string, TsConfigResult> = {};
  private caches: Record<string, string> = {};

  constructor(opts: Partial<Options> = {}) {
    this.opts = {
      ...defaultOptions,
      ...opts,
      extensions: Array.from(new Set([...defaultOptions.extensions, ...(opts.extensions || [])])),
    };
    const tsconfigFiles = sync(this.opts.glob)
      .map(t => t.split(path.sep))
      .sort((a, b) => b.length - a.length)
      .map(t => t.join('/'));
    this.tsconfigs = {};
    for (const tsconfigFile of tsconfigFiles) {
      const config = getTsconfig(tsconfigFile);
      if (config) {
        this.tsconfigs[path.resolve(config.path).replaceAll('\\', '/').replace(/\/tsconfig.json$/, '')] = config;
      }
    }
    this.caches = {};
  }

  apply(resolver: Resolver) {
    const target = resolver.ensureHook('relative');
    resolver
      .getHook('described-resolve')
      .tapAsync(pluginName, (request, ctx, callback) => {
        for (const [tsconfigPath, tsconfig] of Object.entries(this.tsconfigs)) {
          if (!tsconfig.config.compilerOptions?.paths) {
            continue;
          }
          const requestPath = getNormalizedPath(request);
          if (this.caches[requestPath]) {
            return resolver.doResolve(
              target,
              { ...request, path: this.caches[requestPath] },
              `${pluginName}: ${request.path} -> ${this.caches[requestPath]} (using cache)`,
              ctx,
              callback,
            );
          }
          const currentPath = path
            .resolve(tsconfigPath, tsconfig.config.compilerOptions?.baseUrl || '.')
            .replaceAll(/\\/g, '/');
          if (!requestPath || !requestPath.startsWith(currentPath)) {
            continue;
          }
          const relativePath = requestPath.replace(currentPath, '').replace(/^[\/\\]/, '');
          const matcher = createPathsMatcher(tsconfig);
          if (!matcher) {
            continue;
          }
          for (const possibleFile of matcher(relativePath)) {
            for (const extension of this.opts.extensions) {
              const file = `${possibleFile}${extension}`;
              if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                const realFile = path.sep === '\\'
                  ? file.replaceAll('/', '\\')
                  : file;
                this.caches[requestPath] = realFile;
                return resolver.doResolve(
                  target,
                  { ...request, path: realFile },
                  `${pluginName}: ${request.path} -> ${realFile}`,
                  ctx,
                  callback,
                );
              }
            }
          }
        }
        return callback();
      });
  }
}

export default MultiTsconfigPathsWebpackPlugin;
