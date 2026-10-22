// Node's SSR test runner has no browser CSS pipeline. Rendering tests intentionally
// ignore styles; Vite build and browser review verify the real stylesheet separately.
import { register } from 'node:module';
register('./ignore-css-loader.mjs', import.meta.url);
