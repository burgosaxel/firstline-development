import { createApp } from './app.js';
import { assertLocalDemoComposition, runtimeConfig } from './config.js';

const port = Number(process.env.PORT ?? 5174);
const host = process.env.HOST ?? '127.0.0.1';
const config = runtimeConfig();
assertLocalDemoComposition(config, host);

createApp({ config }).listen(port, host, () => console.log(`FirstLine Analytics private API http://${host}:${port}`));