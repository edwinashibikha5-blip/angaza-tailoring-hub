const fs = require('fs');
const { execSync } = require('child_process');

const html = fs.readFileSync('index.html', 'utf8');
let js = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

// 1. Auto-clean duplicate v73+ patch blocks if re-run
const marker = '/* === v73 FIX:';
const firstIdx = js.indexOf(marker);
if (firstIdx !== -1) {
  const secondIdx = js.indexOf(marker, firstIdx + 10);
  if (secondIdx !== -1) {
    js = js.slice(0, secondIdx).trimEnd() + '\n';
    fs.writeFileSync('app.js', js, 'utf8');
    console.log('CLEANED -> Removed duplicate patch block in app.js');
  }
}

// 2. Syntax check JS files
execSync('node --check app.js');
execSync('node --check sw.js');
console.log('SYNTAX -> app.js & sw.js passed cleanly');

// 3. Version sync check
const htmlV = (html.match(/\?v=(\d+)/) || [])[1];
const swV = (sw.match(/angaza-hub-v(\d+)/) || [])[1];
console.log(`VERSION -> index.html: v${htmlV} | sw.js: angaza-hub-v${swV} | Match: ${htmlV === swV}`);

// 4. Home screen isolation check
const posTabOrders = html.indexOf('id="tab-orders"');
const posKaribu = html.indexOf('id="naomi-welcome-card"');
const posStock = html.indexOf('id="shop-overview-card"');
console.log('LAYOUT -> Karibu inside #tab-orders:', posTabOrders !== -1 && posKaribu > posTabOrders);
console.log('LAYOUT -> Shop Overview inside #tab-orders:', posTabOrders !== -1 && posStock > posTabOrders);

// 5. Full-app critical IDs check (All 5 Tabs + Forms + Finance + Calculator)
const requiredIds = [
  'tab-orders', 'tab-repairs', 'tab-clients', 'tab-gallery', 'tab-finance',
  'repair-form', 'client-form', 'gallery-form', 'exp-form',
  'fin-lock', 'fin-open', 'pin-input', 'pin-unlock-btn', 'pin-lock-btn',
  'btn-audit-pdf', 'btn-backup', 'restore-json-input',
  'calc-save-mem-btn', 'calc-toggle-mem-btn', 'calc-memory-drawer'
];
const missingHtml = requiredIds.filter(id => !html.includes(`id="${id}"`));
console.log('HTML IDS -> Missing:', missingHtml.length === 0 ? 'None (All 20 OK)' : missingHtml.join(', '));
