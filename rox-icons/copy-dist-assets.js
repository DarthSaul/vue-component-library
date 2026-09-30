// scripts/copy-icon-assets.js
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/icons', { recursive: true });
cpSync('icons/generated/icons-sprite.svg', 'dist/icons/icons-sprite.svg');
cpSync('icons/src/index.d.ts', 'dist/icons/index.d.ts');
cpSync('icons/src/sprite.d.ts', 'dist/icons/sprite.d.ts');
cpSync('icons/generated/registry.d.ts', 'dist/icons/registry.d.ts');
