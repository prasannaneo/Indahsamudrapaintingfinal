import { execSync } from 'node:child_process';
try { console.log('--- SRC TREE ---'); execSync('ls -R src | sed -e "s/^/  /"', { stdio: 'inherit' }); } catch(e) { console.log('ls error'); }
