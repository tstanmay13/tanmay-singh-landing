// Accept both Next's flags and the standard preview host/port convention.
import { spawn } from 'node:child_process';
const incoming = process.argv.slice(2);
const args = incoming.filter(arg => arg !== '--strictPort').map(arg => arg === '--host' ? '--hostname' : arg);
if (!args.includes('--port') && !args.includes('-p')) args.push('--port', '3001');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
