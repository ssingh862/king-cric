import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'export', '--clear', '--platform', 'web', '--output-dir', '../dist'], { cwd: new URL('./application/', import.meta.url), stdio: 'inherit', env: {...process.env, EXPO_PUBLIC_API_URL: 'https://king-cric.onrender.com', EXPO_NO_DOTENV: '1'} });
if(result.status !== 0) process.exit(result.status ?? 1);
const file = new URL('./dist/index.html', import.meta.url);
writeFileSync(file, readFileSync(file, 'utf8').replace('<title>KingCric</title>', '<title>KingCric — Every gully has a champion</title>').replace('</head>', '<meta name="description" content="Your local cricket clubhouse. Organize tournaments, bring your team together and follow every ball live with KingCric." /></head>'));
