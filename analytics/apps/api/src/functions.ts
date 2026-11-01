import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from './app.js';
import { assertFunctionsComposition, runtimeConfig } from './config.js';

// Imported by Firebase Functions only; it does not open a listener or acquire credentials at import time.
const config = runtimeConfig();
assertFunctionsComposition(config);
export const analyticsApi = onRequest({ region: process.env.FIRSTLINE_FUNCTION_REGION ?? 'us-central1' }, createApp({ config }));
