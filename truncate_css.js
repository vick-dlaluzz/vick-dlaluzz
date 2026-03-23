const fs = require('fs');
const file = 'c:\\projects\\automations\\lavanderia\\landing-page\\sistema\\styles.css';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const truncated = lines.slice(0, 1052).join('\n') + '\n';
fs.writeFileSync(file, truncated, 'utf8');
console.log('Done. Lines written:', 1052);
