(() => {
  const STORAGE_KEY = 'angaza_atelier_vault_v2';
  const GARMENT_CATALOG = [
    { group: 'Women', name: 'Kitenge / Ankara Dress', desc: 'Maxi, midi, skater, peplum & mermaid dresses' },
    { group: 'Women', name: 'Women Official Suit & Blazer', desc: 'Tailored blazer, pencil skirt & formal trousers' },
    { group: 'Women', name: 'Blouse, Skirt & Jumpsuit', desc: 'A-line skirts, chiffon blouses, bridal & evening wear' },
    { group: 'Men', name: 'Men 2-Piece / 3-Piece Suit', desc: 'Wedding, office & executive tailored suits' },
    { group: 'Men', name: 'Kaunda / Safari & African Wear', desc: 'Senator wear, Agbada, Kitenge & linen shirts' },
    { group: 'Men', name: 'Official Shirts, Trousers & Coats', desc: 'Slim/classic shirts, chinos, waistcoats & overcoats' },
    { group: 'Girls', name: 'Girls Party & Ankara Dresses', desc: 'Flowy princess, pleated & traditional dresses' },
    { group: 'Girls', name: 'Girls School Uniform & Casuals', desc: 'Tunics, pleated skirts, blouses & sweaters' },
    { group: 'Boys', name: 'Boys Suit & African Outfit', desc: 'Junior 3-piece suits, senator sets & shirts' },
    { group: 'Boys', name: 'Boys School Uniform & Shorts', desc: 'School shorts, trousers, shirts & blazers' }
  ];
  const todayISO = () => new Date().toISOString().split('T');
  const fmtKES = (num) => 'KES ' + Number(num || 0).toLocaleString('en-KE');

  function loadVault() {
    try {
      const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        pin: p.pin || '1234',
        clients: Array.isArray(p.clients) ? p.clients : [],
        orders: Array.isArray(p.orders) ? p.orders : [],
        repairs: Array.isArray(p.repairs) ? p.repairs : [],
        expenses: Array.isArray(p.expenses) ? p.expenses : [],
        gallery: Array.isArray(p.gallery) ? p.gallery : []
      };
    } catch { return { pin: '1234', clients: [], orders: [], repairs: [], expenses: [], gallery: [] }; }
  }
  const saveVault = (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v));

  function fileToDataURL(file) {
    return new Promise((res) => {
      if (!file) return res('');
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res('');
      r.readAsDataURL(file);
    });
  }

  function populateOrderPresets() {
    const cat = document.getElementById('ord-category').value;
    const items = GARMENT_CATALOG.filter((g) => g.group === cat);
    document.getElementById('ord-style-preset').innerHTML =
      '<option value="">-- Choose Preset --</option>' + items.map((i) => `<option value="${i.name}">${i.name}</option>`).join('');
  }

  function renderDashboard(v) {
    document.getElementById("dash-date").textContent = new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const active = v.orders.filter((o) => o.status !== "Delivered" && o.status !== "Ready").length;
    const ready = v.orders.filter((o) => o.status === "Ready").length;
    document.getElementById("kpi-active-orders").textContent = active;
    document.getElementById("kpi-ready-orders").textContent = ready;
    document.getElementById("kpi-repair-count").textContent = v.repairs.length;
    document.getElementById("kpi-clients-count").textContent = v.clients.length;
  }

  function renderClients(v) {
    document.getElementById('ord-client').innerHTML = v.clients.length
      ? v.clients.map((c) => `<option value="${c.id}">${c.name} (${c.group})</option>`).join('')
      : '<option value="">-- Add Client in "Clients" --</option>';
    const q = document.getElementById('client-search').value.trim().toLowerCase();
    const list = document.getElementById('clients-list');
    const f = v.clients.filter((c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.phone.includes(q));
    if (!f.length) { list.innerHTML = '<p class="empty-msg">No matching clients saved.</p>'; return; }
    list.innerHTML = f.slice().reverse().map((c) => {
      const m = c.meas || {};
      return `<div class="list-item"><div class="item-top"><div><div class="item-title">${c.name} <span class="badge">${c.group}</span></div><div class="item-meta">📞 ${c.phone}</div></div><button type="button" class="btn-sm btn-del" data-del-client="${c.id}">Delete</button></div><div class="item-meta">Chest/Bust:${m.chest||'-'} | Waist:${m.waist||'-'} | Hips:${m.hips||'-'} | Shldr:${m.shoulder||'-'} | Sleeve:${m.sleeve||'-'} | Len:${m.length||'-'} | Lower:${m.outseam||'-'} (${c.unit||'in'})</div>${c.notes ? `<div class="item-meta">📝 ${c.notes}</div>` : ''}</div>`;
    }).join('');
  }

  function renderOrders(v) {
    const fc = document.getElementById('filter-order-cat').value;
    const list = document.getElementById('orders-list');
    const f = v.orders.filter((o) => fc === 'ALL' || o.category === fc);
    if (!f.length) { list.innerHTML = '<p class="empty-msg">No orders logged yet.</p>'; return; }
    list.innerHTML = f.slice().reverse().map((o) => {
      const bal = Math.max(0, Number(o.price) - Number(o.deposit));
      const ph = (o.clientPhone || '').replace(/\D/g, '').replace(/^0/, '254');
      const msg = encodeURIComponent(`Hello ${o.clientName}, your ${o.style} (${o.category}) at ANGAZA TAILORING HUB is "${o.status}". Balance: ${fmtKES(bal)}.`);
      return `<div class="list-item"><div class="item-top"><div><div class="item-title">${o.clientName} — ${o.style}</div><span class="badge">${o.category}</span> <span class="badge badge-ember">${o.status}</span></div>${o.photo ? `<img src="${o.photo}" class="thumb" alt="Fabric" />` : ''}</div><div class="item-meta">Total: <strong>${fmtKES(o.price)}</strong> • Paid: <strong>${fmtKES(o.deposit)}</strong> • Bal: <strong>${fmtKES(bal)}</strong> • Due: ${o.due}</div><div class="item-actions"><button type="button" class="btn-sm" data-cycle-status="${o.id}">Next Stage</button><button type="button" class="btn-sm" data-pay-bal="${o.id}">Clear Balance</button><button type="button" class="btn-sm" data-print-ord="${o.id}">Receipt</button>${ph ? `<a class="btn-sm btn-wa" href="https://wa.me{ph}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<button type="button" class="btn-sm btn-del" data-del-ord="${o.id}">Delete</button></div></div>`;
    }).join('');
  }
  function renderRepairs(v) {
    const total = v.repairs.reduce((s, r) => s + Number(r.amount || 0), 0);
    const today = todayISO();
    const todayTot = v.repairs.filter((r) => r.date === today).reduce((s, r) => s + Number(r.amount || 0), 0);
    document.getElementById('repair-total-display').textContent = fmtKES(total);
    document.getElementById('repair-today-display').textContent = `Today: ${fmtKES(todayTot)}`;
    const q = document.getElementById('repair-search').value.trim().toLowerCase();
    const list = document.getElementById('repairs-list');
    const f = v.repairs.filter((r) => r.client.toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q) || (r.date || '').includes(q));
    if (!f.length) { list.innerHTML = '<p class="empty-msg">No repair entries logged yet.</p>'; return; }
    list.innerHTML = f.slice().reverse().map((r) => `<div class="list-item"><div class="item-top"><div><div class="item-title">${r.client} <span class="badge">${r.group||'General'}</span></div><div class="item-meta">📅 ${r.date} • Paid: <strong>${fmtKES(r.amount)}</strong></div></div><button type="button" class="btn-sm btn-del" data-del-rep="${r.id}">Delete</button></div>${r.notes ? `<div class="item-meta">📝 ${r.notes}</div>` : ''}</div>`).join('');
  }

  function renderCatalogAndGallery(v, cat = 'ALL') {
    const items = cat === 'ALL' ? GARMENT_CATALOG : GARMENT_CATALOG.filter((g) => g.group === cat);
    document.getElementById('garment-catalog-grid').innerHTML = items.map((g) => `<div class="cat-card"><span class="badge badge-ember">${g.group}</span><h4>${g.name}</h4><p>${g.desc}</p></div>`).join('');
    document.getElementById('gallery-list').innerHTML = v.gallery.slice().reverse().map((i) => `<div class="gal-item"><img src="${i.photo}" alt="${i.title}" /><div class="gal-item-body"><div><div class="item-title" style="font-size:.8rem;">${i.title}</div><span class="badge">${i.group}</span></div><button type="button" class="btn-sm btn-del" data-del-gal="${i.id}">X</button></div></div>`).join('');
  }

  function renderFinance(v) {
    const paid = v.orders.reduce((s, o) => s + Number(o.deposit || 0), 0);
    const bal = v.orders.reduce((s, o) => s + Math.max(0, Number(o.price) - Number(o.deposit)), 0);
    const rep = v.repairs.reduce((s, r) => s + Number(r.amount || 0), 0);
    const exp = v.expenses.reduce((s, e) => s + Number(e.cost || 0), 0);
    document.getElementById('fin-summary-box').innerHTML = `<div class="fin-box"><span>Custom Orders Paid</span><strong>${fmtKES(paid)}</strong></div><div class="fin-box"><span>Repair Money Total</span><strong>${fmtKES(rep)}</strong></div><div class="fin-box"><span>Pending Balances</span><strong>${fmtKES(bal)}</strong></div><div class="fin-box"><span>Expenses</span><strong>${fmtKES(exp)}</strong></div><div class="fin-box" style="grid-column:span 2;background:#fde6d2;"><span>Net Cash In Hand</span><strong>${fmtKES(paid + rep - exp)}</strong></div>`;
    document.getElementById('exp-list').innerHTML = v.expenses.length
      ? v.expenses.slice().reverse().map((e, i) => `<div class="list-item" style="flex-direction:row;justify-content:space-between;align-items:center;"><span>${e.item} — <strong>${fmtKES(e.cost)}</strong></span><button type="button" class="btn-sm btn-del" data-del-exp="${v.expenses.length - 1 - i}">Delete</button></div>`).join('')
      : '<p class="empty-msg">No expenses recorded.</p>';
  }

  function renderAll() {
    const v = loadVault();
    renderDashboard(v); renderClients(v); renderOrders(v); renderRepairs(v); renderCatalogAndGallery(v); renderFinance(v);
  }

  document.querySelectorAll('.nav button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach((s) => s.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(b.dataset.nav).classList.add('active');
  }));

  document.getElementById('ord-category').addEventListener('change', populateOrderPresets);
  document.getElementById('ord-style-preset').addEventListener('change', (e) => { if (e.target.value) document.getElementById('ord-style').value = e.target.value; });

  document.getElementById('client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = loadVault();
    v.clients.push({
      id: Date.now().toString(), name: document.getElementById('cli-name').value.trim(), phone: document.getElementById('cli-phone').value.trim(),
      group: document.getElementById('cli-group').value, unit: document.getElementById('cli-unit').value,
      meas: { chest: document.getElementById('m-chest').value.trim(), waist: document.getElementById('m-waist').value.trim(), hips: document.getElementById('m-hips').value.trim(), shoulder: document.getElementById('m-shoulder').value.trim(), sleeve: document.getElementById('m-sleeve').value.trim(), length: document.getElementById('m-length').value.trim(), outseam: document.getElementById('m-outseam').value.trim(), neck: document.getElementById('m-neck').value.trim() },
      notes: document.getElementById('cli-notes').value.trim()
    });
    saveVault(v); e.target.reset(); renderAll();
  });

  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = loadVault();
    const c = v.clients.find((x) => x.id === document.getElementById('ord-client').value);
    if (!c) { alert('Please add and select a client first in the Clients tab.'); return; }
    const photo = await fileToDataURL(document.getElementById('ord-photo').files);
    v.orders.push({ id: Date.now().toString(), clientId: c.id, clientName: c.name, clientPhone: c.phone, category: document.getElementById('ord-category').value, style: document.getElementById('ord-style').value.trim(), price: Number(document.getElementById('ord-price').value || 0), deposit: Number(document.getElementById('ord-deposit').value || 0), due: document.getElementById('ord-due').value, status: document.getElementById('ord-status').value, photo });
    saveVault(v); e.target.reset(); document.getElementById('ord-deposit').value = '0'; document.getElementById('ord-due').value = todayISO(); populateOrderPresets(); renderAll();
  });

  document.getElementById('repair-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = loadVault();
    v.repairs.push({ id: Date.now().toString(), client: document.getElementById('rep-client').value.trim(), group: document.getElementById('rep-group').value, amount: Number(document.getElementById('rep-amount').value || 0), date: document.getElementById('rep-date').value || todayISO(), notes: document.getElementById('rep-notes').value.trim() });
    saveVault(v); e.target.reset(); document.getElementById('rep-date').value = todayISO(); renderAll();
  });

  document.getElementById('gallery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = document.getElementById('gal-photo').files;
    if (!f) return;
    const photo = await fileToDataURL(f);
    const v = loadVault();
    v.gallery.push({ id: Date.now().toString(), title: document.getElementById('gal-title').value.trim(), group: document.getElementById('gal-group').value, photo });
    saveVault(v); e.target.reset(); renderAll();
  });

  document.querySelectorAll('#catalog-chips .chip').forEach((ch) => ch.addEventListener('click', () => {
    document.querySelectorAll('#catalog-chips .chip').forEach((x) => x.classList.remove('active'));
    ch.classList.add('active'); renderCatalogAndGallery(loadVault(), ch.dataset.cat);
  }));

  document.body.addEventListener('click', (e) => {
    const v = loadVault(); const st = ['Cutting', 'Stitching', 'Fitting', 'Ready', 'Delivered'];
    if (e.target.dataset.delClient) { v.clients = v.clients.filter((x) => x.id !== e.target.dataset.delClient); saveVault(v); renderAll(); }
    else if (e.target.dataset.delOrd) { v.orders = v.orders.filter((x) => x.id !== e.target.dataset.delOrd); saveVault(v); renderAll(); }
    else if (e.target.dataset.cycleStatus) { const o = v.orders.find((x) => x.id === e.target.dataset.cycleStatus); if (o) { o.status = st[(st.indexOf(o.status) + 1) % st.length]; saveVault(v); renderAll(); } }
    else if (e.target.dataset.payBal) { const o = v.orders.find((x) => x.id === e.target.dataset.payBal); if (o) { o.deposit = o.price; saveVault(v); renderAll(); } }
    else if (e.target.dataset.printOrd) { const o = v.orders.find((x) => x.id === e.target.dataset.printOrd); if (o) { const bal = Math.max(0, Number(o.price) - Number(o.deposit)); document.getElementById('print-receipt-area').innerHTML = `<h2>ANGAZA TAILORING HUB</h2><p>Tel: Naomi: +254 106 35228 / +254 725 240629</p><hr/><p><strong>Client:</strong> ${o.clientName}</p><p><strong>Garment:</strong> ${o.style} [${o.category}]</p><p><strong>Total:</strong> ${fmtKES(o.price)} | <strong>Paid:</strong> ${fmtKES(o.deposit)} | <strong>Balance:</strong> ${fmtKES(bal)}</p>`; window.print(); } }
    else if (e.target.dataset.delRep) { v.repairs = v.repairs.filter((x) => x.id !== e.target.dataset.delRep); saveVault(v); renderAll(); }
    else if (e.target.dataset.delGal) { v.gallery = v.gallery.filter((x) => x.id !== e.target.dataset.delGal); saveVault(v); renderAll(); }
    else if (e.target.dataset.delExp !== undefined) { v.expenses.splice(Number(e.target.dataset.delExp), 1); saveVault(v); renderAll(); }
  });

  document.getElementById('filter-order-cat').addEventListener('change', renderAll);
  document.getElementById('client-search').addEventListener('input', renderAll);
  document.getElementById('repair-search').addEventListener('input', renderAll);
  document.getElementById('pin-unlock-btn').addEventListener('click', () => {
    const v = loadVault();

    if (document.getElementById('pin-input').value.trim() === v.pin) { document.getElementById('fin-lock').style.display = 'none'; document.getElementById('fin-open').style.display = 'block'; document.getElementById('pin-error').textContent = ''; document.getElementById('pin-input').value = ''; }
    else { document.getElementById('pin-error').textContent = 'Incorrect Owner PIN.'; }
  });
  document.getElementById('pin-lock-btn').addEventListener('click', () => { document.getElementById('fin-lock').style.display = 'block'; document.getElementById('fin-open').style.display = 'none'; });
  document.getElementById('save-pin').addEventListener('click', () => { const np = document.getElementById('new-pin').value.trim(); if (np.length >= 4) { const v = loadVault(); v.pin = np; saveVault(v); document.getElementById('new-pin').value = ''; alert('Owner PIN updated.'); } });
  document.getElementById('exp-form').addEventListener('submit', (e) => { e.preventDefault(); const v = loadVault(); v.expenses.push({ item: document.getElementById('exp-item').value.trim(), cost: Number(document.getElementById('exp-cost').value || 0) }); saveVault(v); e.target.reset(); renderAll(); });
  document.getElementById('btn-backup').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(loadVault(), null, 2)], { type: 'application/json' })); a.download = `angaza-tailoring-hub-${todayISO()}.json`; a.click(); });

  document.getElementById('ord-due').value = todayISO();
  document.getElementById('rep-date').value = todayISO();
  populateOrderPresets();
  renderAll();
})();

(() => {
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  document.body.appendChild(toast);
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function goToTab(tabId) {
    const btn = document.querySelector(`.nav button[data-nav="${tabId}"]`);
    if (btn) btn.click();
  }

  // Make top dashboard KPI cards interactive shortcuts
  const kpiCards = document.querySelectorAll('.kpi-card');
  const kpiTargets = ['tab-orders', 'tab-orders', 'tab-repairs', 'tab-clients'];
  kpiCards.forEach((card, idx) => {
    card.title = 'Tap to open section';
    card.addEventListener('click', () => {
      if (kpiTargets[idx]) goToTab(kpiTargets[idx]);
    });
  });

  // Auto-select garment category when picking a client
  document.getElementById('ord-client').addEventListener('change', (e) => {
    try {
      const vault = JSON.parse(localStorage.getItem('angaza_atelier_vault_v2') || '{}');
      const cli = (vault.clients || []).find((c) => c.id === e.target.value);
      if (cli && cli.group) {
        const catEl = document.getElementById('ord-category');
        catEl.value = cli.group;
        catEl.dispatchEvent(new Event('change'));
      }
    } catch {}
  });

  // Tap any garment card in Catalog to start a pre-filled order
  document.getElementById('garment-catalog-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.cat-card');
    if (!card) return;
    const group = card.querySelector('.badge')?.textContent?.trim();
    const title = card.querySelector('h4')?.textContent?.trim();
    if (group && title) {
      const catEl = document.getElementById('ord-category');
      catEl.value = group;
      catEl.dispatchEvent(new Event('change'));
      document.getElementById('ord-style').value = title;
      goToTab('tab-orders');
      showToast(`Selected: ${title} (${group})`);
    }
  });

  // Instant toast feedback on saves & actions
  ['order-form', 'repair-form', 'client-form', 'gallery-form', 'exp-form'].forEach((id) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener('submit', () => showToast('Saved to Tailoring Vault ✓'));
  });
})();

(() => {
  // Partial Balance Payment on Orders
  document.body.addEventListener('click', (e) => {
    const id = e.target.dataset.payPart;
    if (!id) return;
    const vault = JSON.parse(localStorage.getItem('angaza_atelier_vault_v2') || '{}');
    const ord = (vault.orders || []).find((o) => o.id === id);
    if (!ord) return;
    const bal = Math.max(0, Number(ord.price) - Number(ord.deposit));
    const amtStr = prompt(`Enter payment received from ${ord.clientName} (Balance: KES ${bal}):`);
    const amt = Number(amtStr);
    if (amt > 0) {
      ord.deposit = Math.min(Number(ord.price), Number(ord.deposit) + amt);
      localStorage.setItem('angaza_atelier_vault_v2', JSON.stringify(vault));
      document.getElementById('filter-order-cat').dispatchEvent(new Event('change'));
    }
  });

  // Inject "+ Pay Part" button next to "Clear Balance" whenever orders render
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-pay-bal]').forEach((btn) => {
      if (btn.parentElement.querySelector('[data-pay-part]')) return;
      const partBtn = document.createElement('button');
      partBtn.type = 'button';
      partBtn.className = 'btn-sm';
      partBtn.dataset.payPart = btn.dataset.payBal;
      partBtn.textContent = '+ Pay Part';
      btn.parentElement.insertBefore(partBtn, btn);
    });
  });
  const ordList = document.getElementById('orders-list');
  if (ordList) obs.observe(ordList, { childList: true });

  // Restore JSON Backup inside PIN-protected Finance tab
  const restoreInput = document.getElementById('restore-json-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || typeof data !== 'object') throw new Error();
          localStorage.setItem('angaza_atelier_vault_v2', JSON.stringify(data));
          alert('Tailoring Vault backup restored! Reloading...');
          location.reload();
        } catch {
          alert('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    });
  }
})();

(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  const shareBtn = document.getElementById('btn-share-app');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const appUrl = 'https://angaza-tailoring-hub.onrender.com';
      if (navigator.share) {
        try {
          await navigator.share({ title: "ANGAZA TAILORING HUB", url: "https://angaza-tailoring-hub.onrender.com" });
          return;
        } catch {}
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(appUrl);
        alert('Copied full app link: ' + appUrl);
      } else {
        prompt('Copy this full app link:', appUrl);
      }
    });
  }
})();

(() => {
  document.body.addEventListener('click', (e) => {
    const platform = e.target.dataset.webSearch;
    if (!platform) return;
    const raw = (document.getElementById('online-style-query')?.value || '').trim();
    const activeChip = document.querySelector('#catalog-chips .chip.active')?.dataset.cat;
    const groupPrefix = activeChip && activeChip !== 'ALL' ? activeChip + ' ' : '';
    const query = encodeURIComponent((raw || (groupPrefix + 'African Kitenge tailoring fashion')).trim());

    const urls = {
      google: "https://google.com" + query,
      pinterest: "https://pinterest.com" + query,
      instagram: "https://google.com+" + query,
      jumia: "https://jumia.co.ke" + query
    };
    if (urls[platform]) window.open(urls[platform], '_blank', 'noopener');
  });
})();

(() => {
  const auditBtn = document.getElementById('btn-audit-pdf');
  if (!auditBtn) return;

  auditBtn.addEventListener('click', () => {
    const v = JSON.parse(localStorage.getItem('angaza_atelier_vault_v2') || '{}');
    const orders = v.orders || [];
    const repairs = v.repairs || [];
    const expenses = v.expenses || [];
    const clients = v.clients || [];

    const billed = orders.reduce((s, o) => s + Number(o.price || 0), 0);
    const paid = orders.reduce((s, o) => s + Number(o.deposit || 0), 0);
    const pending = Math.max(0, billed - paid);
    const repTotal = repairs.reduce((s, r) => s + Number(r.amount || 0), 0);
    const expTotal = expenses.reduce((s, e) => s + Number(e.cost || 0), 0);
    const net = paid + repTotal - expTotal;
    const fmt = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
    const nowStr = new Date().toLocaleString('en-KE');

    const orderRows = orders.length
      ? orders.map((o, i) => {
          const bal = Math.max(0, Number(o.price) - Number(o.deposit));
          return `<tr><td>${i + 1}</td><td>${o.clientName}</td><td>${o.style} (${o.category})</td><td>${o.status}</td><td>${fmt(o.price)}</td><td>${fmt(o.deposit)}</td><td>${fmt(bal)}</td></tr>`;
        }).join('')
      : '<tr><td colspan="7">No custom orders recorded.</td></tr>';

    const repairRows = repairs.length
      ? repairs.map((r, i) => `<tr><td>${i + 1}</td><td>${r.date || '-'}</td><td>${r.client}</td><td>${r.group || '-'}</td><td>${r.notes || '-'}</td><td>${fmt(r.amount)}</td></tr>`).join('')
      : '<tr><td colspan="6">No repair records logged.</td></tr>';

    const expRows = expenses.length
      ? expenses.map((e, i) => `<tr><td>${i + 1}</td><td>${e.item}</td><td>${fmt(e.cost)}</td></tr>`).join('')
      : '<tr><td colspan="3">No expenses logged.</td></tr>';

    const area = document.getElementById('print-receipt-area');
    area.innerHTML = `
      <div style="font-family:sans-serif;color:#111;line-height:1.45;">
        <div style="border-bottom:3px solid #1e3a8a;padding-bottom:8px;margin-bottom:12px;">
          <h1 style="margin:0;font-size:20px;color:#1e3a8a;">ANGAZA TAILORING HUB — AUDIT REPORT</h1>
          <p style="margin:3px 0 0;font-size:12px;">Contact: Naomi (+254 106 35228 / +254 725 240629) • Generated: ${nowStr}</p>
        </div>

        <h3 style="margin:10px 0 6px;font-size:14px;color:#581c87;">1. Financial &amp; Shop Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;" border="1" cellpadding="6">
          <tr><td><strong>Saved Clients:</strong> ${clients.length}</td><td><strong>Total Orders:</strong> ${orders.length}</td><td><strong>Total Repairs:</strong> ${repairs.length}</td></tr>
          <tr><td><strong>Custom Orders Billed:</strong> ${fmt(billed)}</td><td><strong>Custom Deposits Paid:</strong> ${fmt(paid)}</td><td><strong>Pending Balances:</strong> ${fmt(pending)}</td></tr>
          <tr><td><strong>Repair Money Total:</strong> ${fmt(repTotal)}</td><td><strong>Material Expenses:</strong> ${fmt(expTotal)}</td><td><strong>Net Cash In Hand:</strong> ${fmt(net)}</td></tr>
        </table>

        <h3 style="margin:10px 0 6px;font-size:14px;color:#581c87;">2. Custom Tailoring Orders Ledger</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;" border="1" cellpadding="5">
          <tr style="background:#eef7ff;"><th>#</th><th>Client</th><th>Garment</th><th>Status</th><th>Price</th><th>Paid</th><th>Balance</th></tr>
          ${orderRows}
        </table>

        <h3 style="margin:10px 0 6px;font-size:14px;color:#581c87;">3. Repair Money Ledger</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;" border="1" cellpadding="5">
          <tr style="background:#eef7ff;"><th>#</th><th>Date</th><th>Customer / Garment</th><th>Group</th><th>Notes</th><th>Amount</th></tr>
          ${repairRows}
        </table>

        <h3 style="margin:10px 0 6px;font-size:14px;color:#581c87;">4. Material &amp; Trim Expenses</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;" border="1" cellpadding="5">
          <tr style="background:#eef7ff;"><th>#</th><th>Expense Item</th><th>Cost</th></tr>
          ${expRows}
        </table>
      </div>
    `;
    window.print();
  });
})();

(() => {
  const dashPanel = document.querySelector('.dashboard-panel');
  const kpiGrid = dashPanel?.querySelector('.kpi-grid');
  const toggleBtn = document.getElementById('toggle-dash-btn');
  if (!dashPanel || !kpiGrid || !toggleBtn) return;

  function setDashCollapsed(collapsed) {
    kpiGrid.style.display = collapsed ? 'none' : 'grid';
    dashPanel.style.padding = collapsed ? '9px 14px' : '14px';
    dashPanel.querySelector('.dash-header').style.marginBottom = collapsed ? '0' : '10px';
    toggleBtn.textContent = collapsed ? 'Show' : 'Hide';
  }

  toggleBtn.addEventListener('click', () => {
    const isHidden = kpiGrid.style.display === 'none';
    setDashCollapsed(!isHidden);
  });

  document.querySelectorAll('.nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      setDashCollapsed(btn.dataset.nav !== 'tab-orders');
    });
  });
})();

(() => {
  const ENGINES = {
    google: { base: 'https://google.com', param: 'q', extra: { tbm: 'isch' } },
    pinterest: { base: 'https://pinterest.com', param: 'q' },
    instagram: { base: 'https://google.com', param: 'q', prefix: 'site:instagram.com ' },
    jumia: { base: 'https://jumia.co.ke', param: 'q' }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-web-search]');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const cfg = ENGINES[btn.dataset.webSearch];
    if (!cfg) return;

    const raw = (document.getElementById('online-style-query')?.value || '').trim();
    const activeCat = document.querySelector('#catalog-chips .chip.active')?.dataset.cat;
    const catWord = activeCat && activeCat !== 'ALL' ? activeCat + ' ' : '';
    const searchTerm = (cfg.prefix || '') + (raw || (catWord + 'African Kitenge tailoring fashion')).trim();

    const targetUrl = new URL(cfg.base);
    targetUrl.searchParams.set(cfg.param, searchTerm);
    if (cfg.extra) {
      Object.entries(cfg.extra).forEach(([k, v]) => targetUrl.searchParams.set(k, v));
    }

    window.open(targetUrl.toString(), '_blank', 'noopener,noreferrer');
  }, true);
})();

(() => {
  function attachDownloadButtons() {
    document.querySelectorAll('.gal-item').forEach((card) => {
      if (card.querySelector('[data-dl-img]')) return;
      const img = card.querySelector('img');
      const title = card.querySelector('.item-title')?.textContent?.trim() || 'angaza-style';
      const delBtn = card.querySelector('[data-del-gal]');
      if (!img || !delBtn) return;

      const dlBtn = document.createElement('a');
      dlBtn.href = img.src;
      dlBtn.download = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      dlBtn.className = 'btn-sm';
      dlBtn.dataset.dlImg = '1';
      dlBtn.textContent = '⬇ Save';
      dlBtn.style.marginRight = '4px';
      delBtn.parentElement.insertBefore(dlBtn, delBtn);
    });
  }

  attachDownloadButtons();
  const galList = document.getElementById('gallery-list');
  if (galList) {
    new MutationObserver(attachDownloadButtons).observe(galList, { childList: true, subtree: true });
  }
})();

(() => {
  const ocrInput = document.getElementById('ocr-meas-photo');
  const ocrStatus = document.getElementById('ocr-status');
  if (!ocrInput || !ocrStatus) return;

  function parseMeasurements(text) {
    const clean = text.replace(/\r/g, '\n');
    const findVal = (patterns) => {
      for (const p of patterns) {
        const m = clean.match(new RegExp(p + '\\s*[:\\-=]?\\s*([0-9]+(?:\\.[0-9]+)?)', 'i'));
        if (m && m[1]) return m[1];
      }
      return '';
    };

    const map = {
      'm-chest': findVal(['chest', 'bust', 'b']),
      'm-waist': findVal(['waist', 'w']),
      'm-hips': findVal(['hips', 'hip', 'h']),
      'm-shoulder': findVal(['shoulder', 'shldr', 'sh', 's']),
      'm-sleeve': findVal(['sleeve', 'slv', 'arm']),
      'm-length': findVal(['length', 'dress', 'top', 'len', 'l']),
      'm-outseam': findVal(['trouser', 'skirt', 'outseam', 'inseam', 'pant']),
      'm-neck': findVal(['neck', 'collar', 'thigh'])
    };

    let filled = 0;
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) {
        el.value = val;
        filled++;
      }
    });
    return filled;
  }

  ocrInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof Tesseract === 'undefined') {
      ocrStatus.textContent = 'Offline mode: Connect to internet once to load the OCR scanner, or type measurements below.';
      return;
    }

    ocrStatus.textContent = '⏳ Reading measurements from photo... Please wait a few seconds.';
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const rawText = (result?.data?.text || '').trim();
      if (!rawText) {
        ocrStatus.textContent = 'Could not detect clear text. Try a brighter, closer photo.';
        return;
      }

      const filledCount = parseMeasurements(rawText);
      const notesEl = document.getElementById('cli-notes');
      if (notesEl) {
        notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + 'Scanned Notes:\n' + rawText;
      }

      ocrStatus.textContent = filledCount > 0
        ? `✅ Transcribed! Auto-filled ${filledCount} measurement box(es) and saved full text to Notes.`
        : '✅ Text transcribed into Fit & Style Notes below. Review and adjust numbers as needed.';
    } catch {
      ocrStatus.textContent = 'Scan failed. Please try a clearer photo with good lighting.';
    }
  });
})();

(() => {
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const checkUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update().catch(() => {});
      });
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkUpdate();
    });
    setInterval(checkUpdate, 60000);
  }

  const syncBtn = document.getElementById('btn-sync-app');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.textContent = '⏳';
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update().catch(() => {});
      }
      window.location.reload();
    });
  }
})();

(() => {
  const ocrInput = document.getElementById('ocr-meas-photo');
  const ocrStatus = document.getElementById('ocr-status');
  const idleHint = document.getElementById('ocr-idle-hint');
  const previewWrap = document.getElementById('ocr-preview-wrap');
  const previewImg = document.getElementById('ocr-preview-img');
  const rescanBtn = document.getElementById('ocr-rescan-btn');
  if (!ocrInput || !ocrStatus) return;

  let lastFile = null;

  // 1. High-Contrast Adaptive Image Pre-Processor for Handwritten Notebooks
  function preprocessForOCR(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const targetW = Math.min(1800, Math.max(1000, img.width * 1.5));
          const scale = targetW / img.width;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          let sum = 0;
          const grays = new Uint8Array(d.length / 4);

          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
            grays[p] = g;
            sum += g;
          }

          const mean = sum / grays.length;
          const threshold = Math.max(95, Math.min(185, mean * 0.88));

          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const v = grays[p] < threshold ? 0 : 255;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
            d[i + 3] = 255;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve({ processedUrl: canvas.toDataURL('image/png'), rawUrl: reader.result });
        };
        img.onerror = () => resolve({ processedUrl: reader.result, rawUrl: reader.result });
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 2. Smart Fraction & Tailoring Shorthand Parser
  function normalizeText(raw) {
    return raw
      .replace(/½/g, '.5')
      .replace(/¼/g, '.25')
      .replace(/¾/g, '.75')
      .replace(/(\d+)\s+1\s*\/\s*2/g, '$1.5')
      .replace(/(\d+)\s+1\s*\/\s*4/g, '$1.25')
      .replace(/(\d+)\s+3\s*\/\s*4/g, '$1.75')
      .replace(/(\d+)[oO]\b/g, '$10')
      .replace(/\b[lI](\d)\b/g, '1$1');
  }

  function extractMeasurements(rawText) {
    const clean = normalizeText(rawText);
    const findNum = (aliases) => {
      for (const alias of aliases) {
        const rx = new RegExp('(?:^|\\b|\\n)' + alias + '\\s*[:\\-=.xX]?\\s*(\\d{1,2}(?:\\.\\d{1,2})?)', 'i');
        const m = clean.match(rx);
        if (m && m) return m;
      }
      return '';
    };

    const fields = {
      'm-chest': findNum(['bust', 'chest', 'ch', 'b']),
      'm-waist': findNum(['waist', 'wst', 'w']),
      'm-hips': findNum(['hips', 'hip', 'hp', 'h']),
      'm-shoulder': findNum(['shoulder', 'shldr', 'shd', 'sh', 's']),
      'm-sleeve': findNum(['sleeve', 'slv', 'arm', 'sl']),
      'm-length': findNum(['dress\\s*len', 'top\\s*len', 'length', 'len', 'full\\s*len', 'l']),
      'm-outseam': findNum(['trouser', 'skirt', 'outseam', 'inseam', 'pant', 'tr', 'sk']),
      'm-neck': findNum(['neck', 'collar', 'thigh', 'nk'])
    };

    let filled = 0;
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) {
        el.value = val;
        el.style.borderColor = '#16a34a';
        el.style.background = '#f0fdf4';
        filled++;
      }
    });

    // Auto-extract Kenyan phone number if written on the page
    const phoneMatch = clean.match(/(?:\+?254|0)\s*7\d{2}[\s\-]?\d{3}[\s\-]?\d{3}/);
    const phoneEl = document.getElementById('cli-phone');
    if (phoneMatch && phoneEl && !phoneEl.value.trim()) {
      phoneEl.value = phoneMatch.replace(/[\s\-]/g, '');
    }

    return { filled, clean };
  }

  async function runSmartScan(file) {
    if (!file) return;
    lastFile = file;
    if (idleHint) idleHint.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'flex';
    if (rescanBtn) rescanBtn.style.display = 'inline-block';

    if (typeof Tesseract === 'undefined') {
      ocrStatus.textContent = '⚠️ Connect to internet once to initialize the OCR engine, then it caches for offline use.';
      return;
    }

    ocrStatus.textContent = '🔍 Enhancing handwriting contrast & reading measurements...';
    try {
      const { processedUrl, rawUrl } = await preprocessForOCR(file);
      if (previewImg) previewImg.src = rawUrl;

      const result = await Tesseract.recognize(processedUrl, 'eng', {
        tessedit_pageseg_mode: '6'
      });

      const rawText = (result?.data?.text || '').trim();
      const conf = Math.round(result?.data?.confidence || 0);

      if (!rawText) {
        ocrStatus.textContent = '⚠️ No clear text detected. Hold camera steady in bright light and tap Re-Scan.';
        return;
      }

      const { filled, clean } = extractMeasurements(rawText);
      const notesEl = document.getElementById('cli-notes');
      if (notesEl) {
        notesEl.value = 'Scanned Note:\n' + clean;
      }

      ocrStatus.innerHTML = filled > 0
        ? `✅ <strong>Auto-filled ${filled} field(s)</strong> (${conf}% clarity). Green boxes show detected values—verify &amp; save.`
        : `✅ <strong>Text transcribed</strong> (${conf}% clarity) into Fit &amp; Style Notes below.`;
    } catch {
      ocrStatus.textContent = '⚠️ Scan interrupted. Tap Re-Scan or try a brighter photo.';
    }
  }

  ocrInput.addEventListener('change', (e) => {
    const f = e.target.files.item(0);
    if (f) runSmartScan(f);
  }, true);

  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      if (lastFile) runSmartScan(lastFile);
    });
  }
})();

(() => {
  // Automatically save the scanned measurement photo onto the client profile card
  const form = document.getElementById('client-form');
  const previewImg = document.getElementById('ocr-preview-img');
  if (!form || !previewImg) return;

  form.addEventListener('submit', () => {
    const src = previewImg.getAttribute('src');
    if (!src || !src.startsWith('data:image')) return;

    setTimeout(() => {
      try {
        const v = JSON.parse(localStorage.getItem('angaza_atelier_vault_v2') || '{}');
        if (Array.isArray(v.clients) && v.clients.length > 0) {
          const newest = v.clients[v.clients.length - 1];
          // Resize thumbnail cleanly so storage stays light
          const c = document.createElement('canvas');
          const scale = Math.min(1, 360 / (previewImg.naturalWidth || 360));
          c.width = Math.round((previewImg.naturalWidth || 360) * scale);
          c.height = Math.round((previewImg.naturalHeight || 360) * scale);
          c.getContext('2d').drawImage(previewImg, 0, 0, c.width, c.height);
          newest.measPhoto = c.toDataURL('image/jpeg', 0.65);
          localStorage.setItem('angaza_atelier_vault_v2', JSON.stringify(v));
        }
        previewImg.removeAttribute('src');
        const wrap = document.getElementById('ocr-preview-wrap');
        if (wrap) wrap.style.display = 'none';
      } catch {}
    }, 80);
  });

  // Render saved measurement photo thumbnail inside Saved Clients list
  const cliList = document.getElementById('clients-list');
  if (cliList) {
    new MutationObserver(() => {
      const v = JSON.parse(localStorage.getItem('angaza_atelier_vault_v2') || '{}');
      const map = new Map((v.clients || []).map((c) => [c.id, c.measPhoto]));
      cliList.querySelectorAll('.list-item').forEach((card) => {
        if (card.querySelector('.meas-saved-thumb')) return;
        const delBtn = card.querySelector('[data-del-client]');
        const photo = delBtn ? map.get(delBtn.dataset.delClient) : '';
        if (photo) {
          const img = document.createElement('img');
          img.src = photo;
          img.className = 'thumb meas-saved-thumb';
          img.title = 'Tap to view full measurement photo';
          img.style.cursor = 'pointer';
          img.addEventListener('click', () => {
            const w = window.open('');
            if (w) w.document.write(`<img src="${photo}" style="max-width:100%;height:auto;" />`);
          });
          card.querySelector('.item-top')?.appendChild(img);
        }
      });
    }).observe(cliList, { childList: true });
  }
})();

(function initFabricAndSizeHelper() {
  const host = document.getElementById('garment-catalog-grid');
  if (!host) return;
  host.style.display = 'block';

  const yardageRules = {
    Women: {
      'Kitenge / Ankara Maxi Dress': { w45: 4.0, w60: 3.0, note: '1 full Kitenge piece (6 yds / 5.5m) is plenty with extra for headwrap (Kitambaa).' },
      'Kitenge Peplum Top & Pencil Skirt': { w45: 3.5, w60: 2.5, note: 'Plus 1.5m lining & 0.5m interfacing for peplum flare.' },
      'Kaftan / Bubu / Dera Gown': { w45: 4.5, w60: 3.2, note: 'Add 0.5m if adding wide butterfly sleeves or embroidery trim.' },
      'Traditional / Ruracio Outfit': { w45: 5.0, w60: 3.8, note: 'Includes allowance for matching headwrap (Kitambaa) & layered flare.' },
      'Women Official Suit (Blazer + Skirt/Trouser)': { w45: 4.5, w60: 3.2, note: 'Plus 2.5m suit lining & 1m fusible interfacing.' },
      'Bridesmaid / Evening Mermaid Gown': { w45: 5.0, w60: 3.8, note: 'Plus 3m satin/pongee lining & net for mermaid volume.' }
    },
    Men: {
      'Kaunda / Safari / Senator Suit': { w45: 4.0, w60: 3.0, note: 'Plus 0.5m collar/placket interfacing & matching buttons.' },
      'Kanzu (Traditional Tunic)': { w45: 3.5, w60: 2.8, note: 'Use lightweight cotton/linen; add 0.5m for tall builds (6ft+).' },
      'Men 2-Piece Official Suit': { w45: 4.5, w60: 3.5, note: 'Plus 2.5m suit lining & 1.5m canvas/interfacing.' },
      'Men 3-Piece Wedding Suit': { w45: 5.5, w60: 4.2, note: 'Plus 3m lining & 1.5m interfacing for jacket & waistcoat.' },
      'Kitenge / Ankara Casual Shirt': { w45: 2.5, w60: 1.8, note: 'Add 0.3m if matching bold Kitenge prints across pocket.' },
      'Official Long-Sleeve Shirt': { w45: 2.5, w60: 1.8, note: 'Plus 0.5m stiff collar & cuff interfacing.' }
    },
    Girls: {
      'Girls School Uniform Dress (Tetron)': { w45: 2.5, w60: 1.8, note: 'Add 0.5m for deep box pleats & school belt/tie.' },
      'Girls Ankara / Sunday Dress': { w45: 2.5, w60: 1.8, note: 'Add 0.5m net/tulle lining for extra skirt puff.' }
    },
    Boys: {
      'Boys Primary School Set (Shirt & Shorts)': { w45: 2.2, w60: 1.6, note: '1.1m shirt fabric + 1.1m heavy Tetron/drill for shorts.' },
      'Boys High School Set (Shirt & Long Trouser)': { w45: 3.0, w60: 2.2, note: '1.4m shirt fabric + 1.6m trouser fabric + zip & pocket lining.' },
      'Boys Kanzu / Safari Set': { w45: 2.8, w60: 2.0, note: 'Plus 0.3m collar interfacing.' }
    }
  };

  const sizeMultiplier = { 'S': 0.9, 'M': 1.0, 'L': 1.1, 'XL': 1.2, 'XXL': 1.35 };

  const sizeCharts = {
    Women: [
      { sz: 'UK 8 (S)', b: '34"', w: '27"', h: '39"', sh: '14.5"', len: '56"' },
      { sz: 'UK 10 (M)', b: '36"', w: '29"', h: '41"', sh: '15"', len: '57"' },
      { sz: 'UK 12 (M/L)', b: '38"', w: '31"', h: '43"', sh: '15.5"', len: '58"' },
      { sz: 'UK 14 (L)', b: '40"', w: '33"', h: '45"', sh: '16"', len: '58"' },
      { sz: 'UK 16 (XL)', b: '42"', w: '36"', h: '48"', sh: '16.5"', len: '59"' },
      { sz: 'UK 18 (XXL)', b: '45"', w: '39"', h: '51"', sh: '17"', len: '59"' },
      { sz: 'UK 20 (3XL)', b: '48"', w: '42"', h: '54"', sh: '17.5"', len: '60"' },
      { sz: 'UK 22 (4XL)', b: '51"', w: '45"', h: '57"', sh: '18"', len: '60"' }
    ],
    Men: [
      { sz: 'Small (S)', b: '37"', w: '30"', h: '37"', sh: '17"', len: '28"' },
      { sz: 'Medium (M)', b: '39"', w: '32"', h: '39"', sh: '17.5"', len: '29"' },
      { sz: 'Large (L)', b: '41"', w: '34"', h: '41"', sh: '18.5"', len: '30"' },
      { sz: 'XL', b: '44"', w: '37"', h: '44"', sh: '19"', len: '31"' },
      { sz: 'XXL', b: '47"', w: '40"', h: '47"', sh: '20"', len: '32"' },
      { sz: '3XL', b: '50"', w: '43"', h: '50"', sh: '21"', len: '33"' }
    ],
    Kids: [
      { sz: '4-5 Yrs (PP1/2)', b: '23"', w: '21"', h: '24"', sh: '11"', len: '24"' },
      { sz: '6-8 Yrs (Gr 1-3)', b: '26"', w: '23"', h: '27"', sh: '12"', len: '28"' },
      { sz: '9-11 Yrs (Gr 4-6)', b: '29"', w: '25"', h: '31"', sh: '13"', len: '33"' },
      { sz: '12-14 Yrs (JSS)', b: '32"', w: '27"', h: '34"', sh: '14.5"', len: '38"' },
      { sz: '15-17 Yrs (High Sch)', b: '35"', w: '29"', h: '37"', sh: '15.5"', len: '42"' }
    ]
  };

  function renderHelper() {
    host.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" id="fh-tab-calc" class="btn-primary" style="flex:1;padding:9px;">📏 Yardage Calculator</button>
        <button type="button" id="fh-tab-size" class="btn-sm" style="flex:1;padding:9px;">📐 Kenya Size Chart</button>
      </div>

      <div id="fh-pane-calc">
        <div class="grid-2">
          <div class="field">
            <label for="fh-group">Group</label>
            <select id="fh-group">
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Girls">Girls</option>
              <option value="Boys">Boys</option>
            </select>
          </div>
          <div class="field">
            <label for="fh-size">Body Size</label>
            <select id="fh-size">
              <option value="S">Small (UK 8 / S)</option>
              <option value="M" selected>Medium (UK 10-12 / M)</option>
              <option value="L">Large (UK 14 / L)</option>
              <option value="XL">Extra Large (UK 16 / XL)</option>
              <option value="XXL">Plus Size (UK 18+ / XXL)</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="fh-style">Garment Style</label>
            <select id="fh-style"></select>
          </div>
          <div class="field">
            <label for="fh-width">Fabric Roll Width</label>
            <select id="fh-width">
              <option value="w45">45" (Kitenge / Ankara / Kikoy)</option>
              <option value="w60">60" (Suiting / Tetron / Linen)</option>
            </select>
          </div>
        </div>
        <div id="fh-result" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px;margin-top:6px;"></div>
      </div>

      <div id="fh-pane-size" style="display:none;">
        <div style="display:flex;gap:6px;margin-bottom:10px;">
          <button type="button" class="chip active" data-sz-grp="Women">Women (KE/UK)</button>
          <button type="button" class="chip" data-sz-grp="Men">Men</button>
          <button type="button" class="chip" data-sz-grp="Kids">School / Kids</button>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
            <thead>
              <tr style="background:#1e3a8a;color:#fff;">
                <th style="padding:6px;">Size</th>
                <th style="padding:6px;">Bust/Ch</th>
                <th style="padding:6px;">Waist</th>
                <th style="padding:6px;">Hips</th>
                <th style="padding:6px;">Shldr</th>
                <th style="padding:6px;">Len</th>
                <th style="padding:6px;">Copy</th>
              </tr>
            </thead>
            <tbody id="fh-size-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const grpEl = document.getElementById('fh-group');
    const styleEl = document.getElementById('fh-style');
    const sizeEl = document.getElementById('fh-size');
    const widthEl = document.getElementById('fh-width');
    const resEl = document.getElementById('fh-result');

    function populateStyles() {
      const styles = Object.keys(yardageRules[grpEl.value] || {});
      styleEl.innerHTML = styles.map((s) => `<option value="${s}">${s}</option>`).join('');
      calcYardage();
    }

    function calcYardage() {
      const rule = yardageRules[grpEl.value]?.[styleEl.value];
      if (!rule) return;
      const base = rule[widthEl.value];
      const mult = sizeMultiplier[sizeEl.value] || 1.0;
      const meters = Math.ceil((base * mult) * 4) / 4;
      const yards = (meters * 1.094).toFixed(1);
      const widthLabel = widthEl.value === 'w45' ? '45-inch (Kitenge/Ankara)' : '60-inch (Suiting/Tetron)';
      const msg = `ANGAZA TAILORING HUB - Fabric Guide:\nGarment: ${styleEl.value} (${grpEl.value}, Size ${sizeEl.value})\nBuy: ${meters} Meters (${yards} Yards) of ${widthLabel} fabric.\nTip: ${rule.note}`;

      resEl.innerHTML = `
        <div style="font-size:16px;font-weight:700;color:#1e3a8a;">Buy: ${meters} Meters <span style="font-size:13px;font-weight:500;color:#475569;">(approx. ${yards} Yards)</span></div>
        <div style="font-size:13px;color:#0f172a;margin:4px 0 10px;">${rule.note}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="fh-copy-btn" class="btn-sm">📋 Copy Note</button>
          <a href="https://wa.me{encodeURIComponent(msg)}" target="_blank" rel="noopener" class="btn-sm btn-wa" style="text-decoration:none;">💬 Send on WhatsApp</a>
        </div>
      `;

      document.getElementById('fh-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(msg);
        document.getElementById('fh-copy-btn').textContent = '✓ Copied!';
      });
    }

    function renderSizeRows(groupKey) {
      const rows = sizeCharts[groupKey] || [];
      const tbody = document.getElementById('fh-size-tbody');
      tbody.innerHTML = rows.map((r, idx) => {
        const summary = `${groupKey} ${r.sz}: Bust/Chest ${r.b}, Waist ${r.w}, Hips ${r.h}, Shoulder ${r.sh}, Length ${r.len}`;
        return `
          <tr style="border-bottom:1px solid #e2e8f0;background:${idx % 2 ? '#f8fafc' : '#fff'};">
            <td style="padding:6px;font-weight:600;">${r.sz}</td>
            <td style="padding:6px;">${r.b}</td>
            <td style="padding:6px;">${r.w}</td>
            <td style="padding:6px;">${r.h}</td>
            <td style="padding:6px;">${r.sh}</td>
            <td style="padding:6px;">${r.len}</td>
            <td style="padding:6px;"><button type="button" class="btn-sm fh-copy-sz" data-txt="${summary}">Copy</button></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.fh-copy-sz').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigator.clipboard?.writeText(btn.dataset.txt);
          btn.textContent = '✓';
        });
      });
    }

    grpEl.addEventListener('change', populateStyles);
    styleEl.addEventListener('change', calcYardage);
    sizeEl.addEventListener('change', calcYardage);
    widthEl.addEventListener('change', calcYardage);

    const tabCalc = document.getElementById('fh-tab-calc');
    const tabSize = document.getElementById('fh-tab-size');
    const paneCalc = document.getElementById('fh-pane-calc');
    const paneSize = document.getElementById('fh-pane-size');

    tabCalc.addEventListener('click', () => {
      paneCalc.style.display = 'block';
      paneSize.style.display = 'none';
      tabCalc.className = 'btn-primary';
      tabSize.className = 'btn-sm';
    });

    tabSize.addEventListener('click', () => {
      paneCalc.style.display = 'none';
      paneSize.style.display = 'block';
      tabSize.className = 'btn-primary';
      tabCalc.className = 'btn-sm';
    });

    host.querySelectorAll('[data-sz-grp]').forEach((chip) => {
      chip.addEventListener('click', () => {
        host.querySelectorAll('[data-sz-grp]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        renderSizeRows(chip.dataset.szGrp);
      });
    });

    populateStyles();
    renderSizeRows('Women');
  }

  renderHelper();
})();

// === PRODUCTION & LOCKED FINANCE SEPARATION MODULE ===
(function initProductionAndLockedFinance() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';

  function loadVault() {
    try {
      return JSON.parse(localStorage.getItem(VAULT_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveVault(data) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(data));
  }

  function formatKES(num) {
    return 'KES ' + Number(num || 0).toLocaleString('en-KE');
  }

  const photoInput = document.getElementById('order-photo');
  const photoLabel = document.getElementById('order-photo-label');
  if (photoInput && photoLabel) {
    photoInput.addEventListener('change', () => {
      photoLabel.textContent = photoInput.files && photoInput.files
        ? '✅ ' + photoInput.files.name.slice(0, 16)
        : '📷 Add Photo';
    });
  }

  const presetSelect = document.getElementById('order-preset');
  const garmentInput = document.getElementById('order-garment');
  if (presetSelect && garmentInput) {
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value && !garmentInput.value.trim()) {
        garmentInput.value = presetSelect.value;
      }
    });
  }

  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', () => {
      const fabricSource = document.getElementById('order-fabric-source')?.value || 'Client Fabric';
      const qty = Math.max(1, parseInt(document.getElementById('order-qty')?.value || '1', 10));
      const priority = document.getElementById('order-priority')?.value || 'Normal';
      const fittingDate = document.getElementById('order-fitting')?.value || '';

      setTimeout(() => {
        const vault = loadVault();
        if (Array.isArray(vault.orders) && vault.orders.length > 0) {
          const latest = vault.orders;
          latest.fabricSource = fabricSource;
          latest.qty = qty;
          latest.priority = priority;
          latest.fittingDate = fittingDate;
          latest.price = Number(latest.price || 0);
          latest.deposit = Number(latest.deposit || 0);
          latest.payMethod = latest.payMethod || 'M-Pesa';
          latest.mpesaRef = latest.mpesaRef || '';
          saveVault(vault);
        }
        if (photoLabel) photoLabel.textContent = '📷 Add Photo';
        renderFinanceOrders();
      }, 60);
    });
  }

  window.renderFinanceOrders = function renderFinanceOrders() {
    const container = document.getElementById('finance-orders-list');
    if (!container) return;

    const vault = loadVault();
    const orders = Array.isArray(vault.orders) ? vault.orders : [];
    const filter = document.getElementById('finance-order-filter')?.value || 'unpaid';

    const filtered = orders.filter((o) => {
      const price = Number(o.price || 0);
      const paid = Number(o.deposit || 0);
      const bal = Math.max(0, price - paid);
      if (filter === 'unpaid') return price === 0 || bal > 0;
      if (filter === 'paid') return price > 0 && bal === 0;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p class="muted-note">No orders match this billing filter.</p>';
      return;
    }

    container.innerHTML = filtered.map((o) => {
      const price = Number(o.price || 0);
      const paid = Number(o.deposit || 0);
      const bal = Math.max(0, price - paid);
      const qty = o.qty || 1;
      const statusBadge = price === 0
        ? '<span class="badge-pay-status">Price Not Set</span>'
        : bal === 0
          ? '<span class="badge-pay-status badge-pay-paid">Fully Paid</span>'
          : '<span class="badge-pay-status">Balance: ' + formatKES(bal) + '</span>';

      return `
        <div class="fin-order-box" data-oid="${o.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong>${o.clientName || 'Client'} — ${o.garment || 'Custom Order'} (x${qty})</strong>
            ${statusBadge}
          </div>
          <div style="font-size:0.82rem;color:#475569;margin-top:4px;">
            Stage: <b>${o.status || 'Cutting'}</b> · Source: ${o.fabricSource || 'Client Fabric'}
            ${o.mpesaRef ? ' · Ref: <b>' + o.mpesaRef + '</b>' : ''}
          </div>
          <div class="fin-grid-2">
            <div>
              <label style="font-size:0.78rem;">Total Price (KES)</label>
              <input type="number" class="fin-price-inp" data-id="${o.id}" value="${price}" min="0" />
            </div>
            <div>
              <label style="font-size:0.78rem;">Total Paid (KES)</label>
              <input type="number" class="fin-paid-inp" data-id="${o.id}" value="${paid}" min="0" />
            </div>
          </div>
          <div class="fin-grid-2">
            <div>
              <label style="font-size:0.78rem;">Payment Method</label>
              <select class="fin-method-inp" data-id="${o.id}">
                <option value="M-Pesa" ${(o.payMethod || 'M-Pesa') === 'M-Pesa' ? 'selected' : ''}>M-Pesa</option>
                <option value="Cash" ${o.payMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                <option value="Bank" ${o.payMethod === 'Bank' ? 'selected' : ''}>Bank</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;">M-Pesa / Receipt Code</label>
              <input type="text" class="fin-ref-inp" data-id="${o.id}" value="${o.mpesaRef || ''}" placeholder="e.g. SJK84X..." />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <button type="button" class="btn-small fin-save-btn" data-id="${o.id}">Save Billing</button>
            ${bal > 0 ? `<button type="button" class="btn-small fin-clear-btn" data-id="${o.id}">Clear Balance (${formatKES(bal)})</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.fin-save-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const vaultData = loadVault();
        const item = (vaultData.orders || []).find((x) => String(x.id) === String(id));
        if (!item) return;

        const priceVal = Number(container.querySelector(`.fin-price-inp[data-id="${id}"]`)?.value || 0);
        const paidVal = Number(container.querySelector(`.fin-paid-inp[data-id="${id}"]`)?.value || 0);
        const methodVal = container.querySelector(`.fin-method-inp[data-id="${id}"]`)?.value || 'M-Pesa';
        const refVal = container.querySelector(`.fin-ref-inp[data-id="${id}"]`)?.value.trim() || '';

        item.price = Math.max(0, priceVal);
        item.deposit = Math.max(0, paidVal);
        item.payMethod = methodVal;
        item.mpesaRef = refVal;
        saveVault(vaultData);

        if (typeof window.renderAll === 'function') window.renderAll();
        renderFinanceOrders();
      });
    });

    container.querySelectorAll('.fin-clear-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const vaultData = loadVault();
        const item = (vaultData.orders || []).find((x) => String(x.id) === String(id));
        if (!item) return;

        item.deposit = Number(item.price || 0);
        saveVault(vaultData);

        if (typeof window.renderAll === 'function') window.renderAll();
        renderFinanceOrders();
      });
    });
  };

  const filterEl = document.getElementById('finance-order-filter');
  if (filterEl) filterEl.addEventListener('change', renderFinanceOrders);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-tab="finance"]') || e.target.id === 'unlock-finance-btn') {
      setTimeout(renderFinanceOrders, 80);
    }
  });

  setTimeout(renderFinanceOrders, 200);
})();

// === NAOMI'S DAILY INSPIRATION & GREETING ===
(function initNaomiInspiration() {
  const quotes = [
    "Every stitch you make turns simple fabric into someone's proudest moment.",
    "Your hands bring beauty, dignity, and confidence to every client who walks in.",
    "Great businesses grow one neat hem, one happy client, and one faithful day at a time.",
    "Quality tailoring speaks louder than any advertisement—keep shining, Naomi!",
    "From a simple sketch to a masterpiece: your skill is a gift that blesses families.",
    "Consistency and care in every seam build a name people trust across town.",
    "Today is a fresh canvas—create with joy, patience, and pride in your craft."
  ];

  const greetingEl = document.getElementById('naomi-greeting');
  const quoteEl = document.getElementById('naomi-daily-quote');

  if (greetingEl) {
    const hr = new Date().getHours();
    const timeWord = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    greetingEl.textContent = `${timeWord}, Naomi ✨`;
  }

  if (quoteEl) {
    const dayIndex = Math.floor(Date.now() / 86400000) % quotes.length;
    quoteEl.textContent = `"${quotes[dayIndex]}"`;
  }
})();

// === INSTANT CACHE-BUST ON SYNC BUTTON CLICK ===
(function initInstantSync() {
  const syncBtn = document.getElementById('btn-sync-app');
  if (!syncBtn) return;
  syncBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    syncBtn.textContent = '⏳';
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
    } catch (err) {}
    window.location.reload(true);
  });
})();

// === CLEAN HOME SUMMARY HUB & SEWING ACCESSORIES MODULE ===
(function initHubHomeAndAccessories() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';

  function loadVault() {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveVault(v) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(v));
  }

  // Keep New Custom Order form collapsed by default on Home so the screen stays clean & uncluttered
  const orderForm = document.getElementById('order-form');
  const toggleOrderBtn = document.getElementById('toggle-order-form-btn');
  if (orderForm && toggleOrderBtn) {
    orderForm.style.display = 'none';
    toggleOrderBtn.addEventListener('click', () => {
      const isHidden = orderForm.style.display === 'none';
      orderForm.style.display = isHidden ? 'grid' : 'none';
      toggleOrderBtn.textContent = isHidden ? '− Hide Form' : '+ Open Form';
    });
  }

  // Wire up the 4 Quick-Action Hub Tiles on Home
  const accPanel = document.getElementById('accessories-panel');
  document.querySelectorAll('.hub-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const target = tile.getAttribute('data-jump');
      if (target === 'orders-form' && orderForm) {
        orderForm.style.display = 'grid';
        if (toggleOrderBtn) toggleOrderBtn.textContent = '− Hide Form';
        orderForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (target === 'accessories-panel' && accPanel) {
        accPanel.style.display = 'block';
        renderAccessories();
        accPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const navBtn = document.querySelector(`[data-tab="${target.replace('tab-', '')}"]`) ||
                       document.querySelector(`[data-target="${target}"]`);
        if (navBtn) navBtn.click();
      }
    });
  });

  const closeAccBtn = document.getElementById('close-accessories-btn');
  if (closeAccBtn && accPanel) {
    closeAccBtn.addEventListener('click', () => {
      accPanel.style.display = 'none';
    });
  }

  // Sewing Accessories & Haberdashery Inventory
  function renderAccessories() {
    const listEl = document.getElementById('accessories-list');
    if (!listEl) return;
    const vault = loadVault();
    const items = Array.isArray(vault.accessories) ? vault.accessories : [];
    if (items.length === 0) {
      listEl.innerHTML = '<p class="muted-note">No sewing accessories logged yet. Add threads, zips, buttons, or lining above.</p>';
      return;
    }
    listEl.innerHTML = items.map((item, idx) => `
      <div class="acc-item-row">
        <div>
          <strong>${item.name}</strong>
          <div style="font-size:0.78rem;color:#475569;">${item.category} · Qty: <b>${item.qty}</b></div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="${item.status === 'In Stock' ? 'acc-ok' : 'acc-low'}">${item.status}</span>
          <button type="button" class="btn-small acc-del-btn" data-idx="${idx}" title="Remove">✕</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.acc-del-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-idx'));
        const v = loadVault();
        if (Array.isArray(v.accessories)) {
          v.accessories.splice(i, 1);
          saveVault(v);
          renderAccessories();
        }
      });
    });
  }

  const accForm = document.getElementById('accessory-form');
  if (accForm) {
    accForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('acc-name')?.value.trim();
      const category = document.getElementById('acc-cat')?.value || 'Threads & Needles';
      const qty = document.getElementById('acc-qty')?.value.trim();
      const status = document.getElementById('acc-status')?.value || 'In Stock';
      if (!name || !qty) return;

      const vault = loadVault();
      vault.accessories = Array.isArray(vault.accessories) ? vault.accessories : [];
      vault.accessories.unshift({ name, category, qty, status, addedAt: new Date().toISOString() });
      saveVault(vault);
      accForm.reset();
      renderAccessories();
    });
  }
})();

// === TOP-RIGHT QUICK SCANNER SHORTCUT ===
(function initTopRightScanner() {
  const scanBtn = document.getElementById('btn-quick-scan');
  if (!scanBtn) return;
  scanBtn.addEventListener('click', () => {
    const clientsTabBtn = document.querySelector('[data-tab="clients"]') ||
                          document.querySelector('[data-target="tab-clients"]');
    if (clientsTabBtn) clientsTabBtn.click();
    setTimeout(() => {
      const ocrInput = document.getElementById('ocr-meas-photo');
      if (ocrInput) {
        ocrInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ocrInput.click();
      }
    }, 120);
  });
})();

// === ZERO-LAG LAZY OCR LOADER & INSTANT REFRESH ===
(function initSpeedBoost() {
  const ocrInput = document.getElementById('ocr-meas-photo');
  if (ocrInput && typeof window.loadTesseractLazy === 'function') {
    ocrInput.addEventListener('click', () => { window.loadTesseractLazy(); }, { passive: true });
    ocrInput.addEventListener('change', async () => {
      if (!window.Tesseract) await window.loadTesseractLazy();
    }, true);
  }

  // Fast background reload on sync button without hanging on network timeouts
  const syncBtn = document.getElementById('btn-sync-app');
  if (syncBtn) {
    const freshBtn = syncBtn.cloneNode(true);
    syncBtn.parentNode.replaceChild(freshBtn, syncBtn);
    freshBtn.addEventListener('click', async () => {
      freshBtn.textContent = '⚡';
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) await reg.update();
        }
      } catch (e) {}
      setTimeout(() => { window.location.reload(); }, 150);
    });
  }
})();

// === HARD PWA CACHE-BUST ON SYNC BUTTON ===
(function bindHardRefresh() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#btn-sync-app');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    btn.textContent = '⚡';
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (err) {}
    window.location.href = window.location.pathname + '?v=' + Date.now();
  }, true);
})();

// === CLEAN SUMMARY-ONLY HOME: OPEN ORDER FORM ONLY WHEN TAPPED ===
(function initSummaryOnlyHome() {
  const orderCard = document.getElementById('order-form')?.closest('.card');
  const orderForm = document.getElementById('order-form');
  if (!orderCard || !orderForm) return;

  orderForm.style.display = 'grid';

  document.querySelectorAll('[data-jump="orders-form"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      orderCard.classList.add('order-form-open');
      orderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const hideBtn = document.getElementById('toggle-order-form-btn');
  if (hideBtn) {
    hideBtn.textContent = '✕ Close';
    hideBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      orderCard.classList.remove('order-form-open');
    }, true);
  }
})();

// === HIDE ORDER FORM BY DEFAULT ON SUMMARY HOME ===
(function hideOrderFormInitially() {
  const form = document.getElementById('order-form');
  if (!form) return;
  form.classList.remove('is-open');
  form.style.removeProperty('display');

  document.querySelectorAll('[data-jump="orders-form"]').forEach((tile) => {
    tile.addEventListener('click', () => {
      form.classList.add('is-open');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const closeBtn = document.getElementById('toggle-order-form-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      form.classList.toggle('is-open');
    });
  }
})();



// === V48: UNIFIED ZERO-LAG HOME CONTROLLER ===
(function initAngazaUnifiedV48() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';
  function loadVault() {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveVault(v) { localStorage.setItem(VAULT_KEY, JSON.stringify(v)); }

  function openTab(tabName) {
    const clean = tabName.replace(/^tab-/, '');
    const navItems = Array.from(document.querySelectorAll('nav button, nav a, .nav button, .nav a, [data-tab], [data-target]'));
    const targetNav = navItems.find((el) => {
      const dt = (el.getAttribute('data-tab') || el.getAttribute('data-target') || '').toLowerCase();
      const txt = el.textContent.trim().toLowerCase();
      return dt.includes(clean) || txt.includes(clean) || (clean === 'orders' && txt.includes('home'));
    });
    if (targetNav) targetNav.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderShopDirectory() {
    const vault = loadVault();
    const items = Array.isArray(vault.shopItems) ? vault.shopItems : [];
    const filter = document.getElementById('shop-dir-filter')?.value || 'all';
    const countEl = document.getElementById('shop-dir-count');
    const listEl = document.getElementById('sell-items-list');
    if (countEl) countEl.textContent = String(items.length);
    if (!listEl) return;

    const filtered = filter === 'all' ? items : items.filter((it) => it.category === filter);
    if (!filtered.length) {
      listEl.innerHTML = '<p style="font-size:0.78rem;color:#475569;margin:4px 0;">No items saved yet. Tap <b>+ Add Item</b> or <b>📷 Scan List</b>.</p>';
      return;
    }
    listEl.innerHTML = filtered.map((it) => {
      const realIdx = items.indexOf(it);
      const hasPrice = Number(it.sellPrice || 0) > 0;
      return `<div class="acc-item-row" style="margin-bottom:5px;padding:7px 9px;">
        <div><strong style="font-size:0.82rem;">${it.name}</strong>
        <div style="font-size:0.73rem;color:#334155;">${it.category} · Stock: <b>${it.qty}</b> ${it.note ? '· ' + it.note : ''}</div></div>
        <div style="display:flex;align-items:center;gap:5px;">
          <span class="badge-pay-status ${hasPrice ? 'badge-pay-paid' : ''}">${hasPrice ? 'Price Set 🔒' : 'Set in Finance'}</span>
          <button type="button" class="btn-small dir-del-btn" data-idx="${realIdx}" style="width:auto;padding:2px 7px;">✕</button>
        </div></div>`;
    }).join('');
  }

  window.renderFinanceShopPrices = function renderFinanceShopPrices() {
    const finList = document.getElementById('finance-shop-items-list');
    if (!finList) return;
    const items = Array.isArray(loadVault().shopItems) ? loadVault().shopItems : [];
    if (!items.length) { finList.innerHTML = '<p class="muted-note">No items in Shop List yet.</p>'; return; }
    finList.innerHTML = items.map((it, idx) => `<div class="fin-order-box">
      <div style="display:flex;justify-content:space-between;"><strong>${it.name}</strong><span>${it.category} · ${it.qty}</span></div>
      <div class="fin-grid-2">
        <div><label style="font-size:0.75rem;">Selling Price (KES)</label>
        <input type="number" class="fin-sell-price" data-idx="${idx}" value="${Number(it.sellPrice || 0)}" min="0" /></div>
        <div style="display:flex;align-items:flex-end;">
        <button type="button" class="btn-small fin-save-item-price" data-idx="${idx}" style="width:100%;">Save Price (KES)</button></div>
      </div></div>`).join('');
  };
  document.addEventListener('click', (e) => {
    const hideBtn = e.target.closest('#toggle-overview-collapse-btn');
    if (hideBtn) {
      const body = document.getElementById('overview-collapse-body');
      if (body) { const h = body.style.display === 'none'; body.style.display = h ? 'block' : 'none'; hideBtn.textContent = h ? 'Hide' : 'Show'; }
      return;
    }
    if (e.target.closest('#open-shop-directory-btn')) {
      const d = document.getElementById('shop-directory-drawer'), f = document.getElementById('sell-item-form');
      if (f) f.style.display = 'none';
      if (d) { const c = d.style.display === 'none'; d.style.display = c ? 'block' : 'none'; if (c) renderShopDirectory(); }
      return;
    }
    const addBtn = e.target.closest('#toggle-sell-item-btn');
    if (addBtn) {
      const f = document.getElementById('sell-item-form'), d = document.getElementById('shop-directory-drawer');
      if (d) d.style.display = 'none';
      if (f) { const c = f.style.display === 'none'; f.style.display = c ? 'grid' : 'none'; addBtn.textContent = c ? '✕ Close' : '+ Add Item'; }
      return;
    }
    const delBtn = e.target.closest('.dir-del-btn');
    if (delBtn) {
      const v = loadVault(); v.shopItems.splice(Number(delBtn.getAttribute('data-idx')), 1); saveVault(v);
      renderShopDirectory(); window.renderFinanceShopPrices(); return;
    }
    const savePriceBtn = e.target.closest('.fin-save-item-price');
    if (savePriceBtn) {
      const idx = Number(savePriceBtn.getAttribute('data-idx')), v = loadVault();
      const inp = document.querySelector(`.fin-sell-price[data-idx="${idx}"]`);
      if (v.shopItems[idx] && inp) {
        v.shopItems[idx].sellPrice = Math.max(0, Number(inp.value || 0)); saveVault(v);
        savePriceBtn.textContent = '✅ Saved'; setTimeout(() => { savePriceBtn.textContent = 'Save Price (KES)'; }, 1200);
        renderShopDirectory();
      }
      return;
    }
    if (e.target.closest('#close-shop-scan-btn')) { const b = document.getElementById('shop-scan-review'); if (b) b.style.display = 'none'; return; }
    const tile = e.target.closest('.hub-tile');
    if (tile) {
      const j = tile.getAttribute('data-jump') || '';
      if (j === 'orders-form') { openTab('clients'); setTimeout(() => { document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' }); }, 120); }
      else if (j === 'tab-gallery') openTab('gallery');
      else if (j === 'tab-repairs') openTab('repairs');
      else if (j === 'accessories-panel') {
        const acc = document.getElementById('accessories-panel');
        if (acc) { const h = acc.style.display === 'none'; acc.style.display = h ? 'block' : 'none'; if (h) acc.scrollIntoView({ behavior: 'smooth' }); }
      }
      return;
    }
    if (e.target.closest('[data-tab="finance"]') || e.target.id === 'unlock-finance-btn') setTimeout(window.renderFinanceShopPrices, 80);
  });

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'sell-item-form') {
      e.preventDefault();
      const name = document.getElementById('sell-name')?.value.trim(), qty = document.getElementById('sell-qty')?.value.trim();
      if (!name || !qty) return;
      const v = loadVault(); v.shopItems = Array.isArray(v.shopItems) ? v.shopItems : [];
      v.shopItems.unshift({ name, category: document.getElementById('sell-cat')?.value || 'Ready Clothes', qty, note: document.getElementById('sell-note')?.value.trim() || '', sellPrice: 0 });
      saveVault(v); e.target.reset(); e.target.style.display = 'none';
      const addBtn = document.getElementById('toggle-sell-item-btn'); if (addBtn) addBtn.textContent = '+ Add Item';
      const drawer = document.getElementById('shop-directory-drawer'); if (drawer) drawer.style.display = 'block';
      renderShopDirectory(); window.renderFinanceShopPrices();
    }
  });
  let pendingScanned = [];
  const scanInp = document.getElementById('scan-shop-list-input');
  if (scanInp) {
    scanInp.addEventListener('change', async () => {
      const file = scanInp.files && scanInp.files, box = document.getElementById('shop-scan-review'), status = document.getElementById('shop-scan-status'), prev = document.getElementById('shop-scan-preview-list'), cBtn = document.getElementById('confirm-shop-scan-btn');
      if (!file || !box) return;
      box.style.display = 'block'; if (cBtn) cBtn.style.display = 'none'; if (prev) prev.innerHTML = ''; if (status) status.textContent = '⏳ Reading list...';
      try {
        if (typeof window.loadTesseractLazy === 'function' && !window.Tesseract) await window.loadTesseractLazy();
        const res = await window.Tesseract.recognize(file, 'eng');
        pendingScanned = ((res?.data?.text) || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 2).map((line) => {
          let clean = line.replace(/^[-*•\d.)\s]+(?=[a-zA-Z])/, '').trim(), sellPrice = 0;
          const pm = clean.match(/(?:kes|ksh|@|=|-)\s*(\d{2,6})\s*$/i);
          if (pm) { sellPrice = Number(pm); clean = clean.slice(0, pm.index).trim(); }
          let qty = '1 pc', name = clean;
          const qm = clean.match(/^(\d+(?:\.\d+)?)\s*(pcs?|pieces?|rolls?|yds?|yards?|m|meters?)?\s+(.+)$/i);
          if (qm) { qty = qm + ' ' + (qm || 'pcs'); name = qm.trim(); }
          return { name, category: 'Other Shop Item', qty, note: 'Scanned', sellPrice };
        });
        if (!pendingScanned.length) { if (status) status.textContent = '⚠️ No clear lines found.'; return; }
        if (status) status.textContent = `✅ Found ${pendingScanned.length} item(s):`;
        if (prev) prev.innerHTML = pendingScanned.map((it, i) => `<label style="display:flex;justify-content:space-between;padding:4px 6px;background:#fff;border:1px solid #fde68a;border-radius:6px;font-size:0.76rem;margin-bottom:3px;"><span><input type="checkbox" class="scan-chk" data-idx="${i}" checked /> <b>${it.name}</b> (${it.qty})</span></label>`).join('');
        if (cBtn) cBtn.style.display = 'block';
      } catch (err) { if (status) status.textContent = '⚠️ Scan failed. Check connection once.'; }
      finally { scanInp.value = ''; }
    });
  }
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'confirm-shop-scan-btn') {
      const chosen = Array.from(document.querySelectorAll('.scan-chk:checked')).map((c) => pendingScanned[Number(c.getAttribute('data-idx'))]).filter(Boolean);
      if (!chosen.length) return;
      const v = loadVault(); v.shopItems = [...chosen, ...(Array.isArray(v.shopItems) ? v.shopItems : [])]; saveVault(v);
      const box = document.getElementById('shop-scan-review'); if (box) box.style.display = 'none';
      const drawer = document.getElementById('shop-directory-drawer'); if (drawer) drawer.style.display = 'block';
      renderShopDirectory(); window.renderFinanceShopPrices();
    }
  });

  const groupPresets = {
    woman: { ph: ['Bust (in)', 'Waist (in)', 'Hips (in)', 'Shoulder (in)', 'Sleeve (in)', 'Full Length'], ease: 5, trim: 6, hrs: 2.8, label: 'Woman' },
    man: { ph: ['Chest (in)', 'Waist (in)', 'Neck/Seat (in)', 'Shoulder (in)', 'Sleeve (in)', 'Shirt/Trouser L'], ease: 6, trim: 9, hrs: 3.2, label: 'Man' },
    child: { ph: ['Chest (in)', 'Waist (in)', 'Hips (in)', 'Shoulder (in)', 'Sleeve (in)', 'Full Length'], ease: 4, trim: 7, hrs: 1.8, label: 'Child' },
    flowing: { ph: ['Bust/Chest', 'Waist/Empire', 'Hips/Flare', 'Shoulder (in)', 'Sleeve (in)', 'Full Length'], ease: 10, trim: 8, hrs: 3.0, label: 'Flowing/Dera' }
  };
  function runFastCalculator() {
    const grp = document.getElementById('calc-person-group')?.value || 'woman', cfg = groupPresets[grp] || groupPresets.woman;
    const b = Number(document.getElementById('m-bust')?.value || 0), w = Number(document.getElementById('m-waist')?.value || 0), h = Number(document.getElementById('m-hips')?.value || 0), sh = Number(document.getElementById('m-shoulder')?.value || 0), sl = Number(document.getElementById('m-sleeve')?.value || 0), len = Number(document.getElementById('m-length')?.value || 0), roll = Number(document.getElementById('calc-fabric-width')?.value || 45);
    const outFab = document.getElementById('calc-out-fabric'), outTime = document.getElementById('calc-out-time');
    if (!outFab || !outTime) return;
    if (!b && !w && !h && !len) { outFab.textContent = `Enter ${cfg.label} measurements in inches`; outTime.textContent = '--'; return; }
    const maxGirth = Math.max(b, w, h, sh * 2.4, grp === 'child' ? 24 : 36), twoLengths = (maxGirth + cfg.ease) > (roll - 1.5), gLen = len > 0 ? len : (grp === 'child' ? 28 : 42);
    const totalIn = (twoLengths ? gLen * 2 : gLen) + (sl > 0 ? sl + 3.5 : 0) + cfg.trim;
    const meters = Math.ceil((totalIn * 0.0254) * 4) / 4, yards = (Math.ceil((totalIn / 36) * 4) / 4).toFixed(2);
    const hrs = cfg.hrs + (gLen >= 48 ? 1.3 : gLen >= 34 ? 0.6 : 0) + (sl >= 16 ? 0.7 : sl > 0 ? 0.35 : 0);
    outFab.innerHTML = `<b>${meters.toFixed(2)}m</b> (${yards} yds @ ${roll}")`;
    outTime.textContent = `${cfg.label} · ${twoLengths ? '2× Length' : '1× Width'} · ~${hrs.toFixed(1)} hrs`;
  }
  const grpSel = document.getElementById('calc-person-group');
  if (grpSel) grpSel.addEventListener('change', () => {
    const cfg = groupPresets[grpSel.value] || groupPresets.woman;
    ['m-bust', 'm-waist', 'm-hips', 'm-shoulder', 'm-sleeve', 'm-length'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.placeholder = cfg.ph[i]; });
    runFastCalculator();
  });
  ['m-bust', 'm-waist', 'm-hips', 'm-shoulder', 'm-sleeve', 'm-length', 'calc-fabric-width'].forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener('input', runFastCalculator); });
  document.getElementById('shop-dir-filter')?.addEventListener('change', renderShopDirectory);
  renderShopDirectory();
})();

// === V49: DYNAMIC DESIGN-AWARE CALCULATOR & FULL SHOP SPREADSHEET MODAL ===
(function initDynamicDesignsAndSpreadsheet() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';
  function loadVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || {}; } catch (e) { return {}; } }
  function saveVault(v) { localStorage.setItem(VAULT_KEY, JSON.stringify(v)); }

  const designCatalog = {
    woman: [
      { id: 'straight', label: '👗 Straight / Pencil Dress', extraEase: 0, extraLen: 0, extraHrs: 0 },
      { id: 'flared', label: '💃 Flared / A-Line / Circle Dress', extraEase: 14, extraLen: 6, extraHrs: 1.0 },
      { id: 'suit', label: '👚 Kitenge Skirt & Blouse Suit', extraEase: 4, extraLen: 10, extraHrs: 1.5 },
      { id: 'bridal', label: '👰 Ruracio / Bridal Gown', extraEase: 18, extraLen: 12, extraHrs: 2.5 },
      { id: 'trouser', label: '👖 Official Trousers / Jumpsuit', extraEase: 6, extraLen: 8, extraHrs: 1.2 }
    ],
    man: [
      { id: 'shirt', label: '👔 Official Long / Short Sleeve Shirt', extraEase: 0, extraLen: 0, extraHrs: 0 },
      { id: 'trouser_m', label: '👖 Official / Chino Trousers', extraEase: 4, extraLen: 6, extraHrs: 0.8 },
      { id: 'kaunda', label: '🧥 Kaunda / Senator Two-Piece Suit', extraEase: 6, extraLen: 18, extraHrs: 2.2 },
      { id: 'kanzu', label: '🕌 Kanzu (Traditional Robe)', extraEase: 8, extraLen: 6, extraHrs: 1.2 },
      { id: 'blazer', label: '🤵 Blazer / Tailored Coat', extraEase: 8, extraLen: 12, extraHrs: 2.5 }
    ],
    child: [
      { id: 'uniform_dress', label: '🎒 School Uniform Dress / Tunic', extraEase: 4, extraLen: 4, extraHrs: 0.4 },
      { id: 'uniform_set', label: '👕 School Shirt & Shorts / Trousers', extraEase: 4, extraLen: 8, extraHrs: 0.7 },
      { id: 'party_dress', label: '🎀 Party / Sunday Flared Dress', extraEase: 10, extraLen: 5, extraHrs: 0.8 },
      { id: 'kids_kitenge', label: '🧒 Kids Kitenge Outfit', extraEase: 4, extraLen: 4, extraHrs: 0.5 }
    ],
    flowing: [
      { id: 'dera', label: '👘 Classic Free-Size Dera', extraEase: 4, extraLen: 0, extraHrs: 0 },
      { id: 'kaftan', label: '✨ Embroidered / Beaded Kaftan', extraEase: 8, extraLen: 4, extraHrs: 1.2 },
      { id: 'abaya', label: '🧕 Abaya / Full Sweep Maxi Robe', extraEase: 12, extraLen: 6, extraHrs: 1.0 },
      { id: 'maternity', label: '🤰 Maternity / Empire Gather Maxi', extraEase: 10, extraLen: 4, extraHrs: 0.8 }
    ]
  };

  const grpSel = document.getElementById('calc-person-group');
  const designSel = document.getElementById('calc-design-type');
  function populateDesigns() {
    if (!grpSel || !designSel) return;
    const list = designCatalog[grpSel.value] || designCatalog.woman;
    designSel.innerHTML = list.map((d) => `<option value="${d.id}">${d.label}</option>`).join('');
  }
  function calcWithDesign() {
    if (!grpSel || !designSel) return;
    const grp = grpSel.value, list = designCatalog[grp] || designCatalog.woman;
    const design = list.find((d) => d.id === designSel.value) || list;
    const b = Number(document.getElementById('m-bust')?.value || 0), w = Number(document.getElementById('m-waist')?.value || 0), h = Number(document.getElementById('m-hips')?.value || 0), sh = Number(document.getElementById('m-shoulder')?.value || 0), sl = Number(document.getElementById('m-sleeve')?.value || 0), len = Number(document.getElementById('m-length')?.value || 0), roll = Number(document.getElementById('calc-fabric-width')?.value || 45);
    const outFab = document.getElementById('calc-out-fabric'), outTime = document.getElementById('calc-out-time');
    if (!outFab || !outTime) return;
    if (!b && !w && !h && !len) { outFab.textContent = `Enter measurements for ${design.label.replace(/^[^\w]+/, '')}`; outTime.textContent = '--'; return; }
    const baseEase = grp === 'man' ? 6 : grp === 'child' ? 4 : grp === 'flowing' ? 10 : 5;
    const baseTrim = grp === 'man' ? 9 : grp === 'child' ? 7 : 6;
    const baseHrs = grp === 'man' ? 3.2 : grp === 'child' ? 1.8 : 2.8;
    const maxGirth = Math.max(b, w, h, sh * 2.4, grp === 'child' ? 24 : 36);
    const twoLengths = (maxGirth + baseEase + design.extraEase) > (roll - 1.5);
    const gLen = (len > 0 ? len : (grp === 'child' ? 28 : 42)) + design.extraLen;
    const totalIn = (twoLengths ? gLen * 2 : gLen) + (sl > 0 ? sl + 3.5 : 0) + baseTrim;
    const meters = Math.ceil((totalIn * 0.0254) * 4) / 4, yards = (Math.ceil((totalIn / 36) * 4) / 4).toFixed(2);
    const hrs = baseHrs + design.extraHrs + (gLen >= 52 ? 0.8 : 0) + (sl >= 16 ? 0.6 : sl > 0 ? 0.3 : 0);
    outFab.innerHTML = `<b>${meters.toFixed(2)}m</b> (${yards} yds @ ${roll}")`;
    outTime.textContent = `${twoLengths ? '2× Length' : '1× Width'} · ~${hrs.toFixed(1)} hrs`;
  }
  if (grpSel && designSel) {
    populateDesigns();
    grpSel.addEventListener('change', () => { populateDesigns(); calcWithDesign(); }, true);
    designSel.addEventListener('change', calcWithDesign, true);
    ['m-bust', 'm-waist', 'm-hips', 'm-shoulder', 'm-sleeve', 'm-length', 'calc-fabric-width'].forEach((id) => document.getElementById(id)?.addEventListener('input', calcWithDesign, true));
  }
  const modal = document.getElementById('shop-hub-modal');
  function switchModalView(v) {
    ['sheet', 'form', 'list'].forEach((k) => { const el = document.getElementById('sm-view-' + k); if (el) el.style.display = k === v ? 'block' : 'none'; });
    document.querySelectorAll('.shop-modal-tab').forEach((b) => {
      const a = b.getAttribute('data-smview') === v;
      b.style.background = a ? '#1e3a8a' : '#eff6ff'; b.style.color = a ? '#ffffff' : '#1e3a8a';
    });
    renderModalData();
  }
  function renderModalData() {
    const items = Array.isArray(loadVault().shopItems) ? loadVault().shopItems : [];
    const q = (document.getElementById('sm-search-inp')?.value || '').trim().toLowerCase();
    const countEl = document.getElementById('shop-dir-count'); if (countEl) countEl.textContent = String(items.length);
    const filtered = q ? items.filter((it) => (it.name + ' ' + it.category + ' ' + (it.note || '')).toLowerCase().includes(q)) : items;
    const tbody = document.getElementById('sm-spreadsheet-tbody');
    if (tbody) tbody.innerHTML = !filtered.length
      ? '<tr><td colspan="5" style="padding:12px;text-align:center;color:#475569;">No items yet. Tap <b>✍️ Custom Form</b> or <b>📷 Scan List</b>.</td></tr>'
      : filtered.map((it) => {
          const idx = items.indexOf(it), hasP = Number(it.sellPrice || 0) > 0;
          return `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px 8px;"><b>${it.name}</b>${it.note ? `<div style="font-size:0.68rem;color:#64748b;">${it.note}</div>` : ''}</td><td style="padding:6px;font-size:0.72rem;">${it.category}</td><td style="padding:6px;font-weight:700;">${it.qty}</td><td style="padding:6px;"><span class="badge-pay-status ${hasP ? 'badge-pay-paid' : ''}">${hasP ? 'Set 🔒' : 'Finance'}</span></td><td style="padding:6px;"><button type="button" class="sm-del-row" data-idx="${idx}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:2px 6px;font-weight:800;">✕</button></td></tr>`;
        }).join('');
    const dir = document.getElementById('sm-directory-cards');
    if (dir) dir.innerHTML = !filtered.length ? '<p class="muted-note">No items saved yet.</p>' : filtered.map((it) => {
      const idx = items.indexOf(it);
      return `<div class="acc-item-row" style="margin-bottom:6px;"><div><strong>${it.name}</strong><div style="font-size:0.75rem;color:#475569;">${it.category} · Stock: <b>${it.qty}</b> ${it.note ? '· ' + it.note : ''}</div></div><button type="button" class="btn-small sm-del-row" data-idx="${idx}" style="width:auto;">✕</button></div>`;
    }).join('');
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#open-shop-directory-btn')) { e.preventDefault(); e.stopImmediatePropagation(); if (modal) { modal.style.display = 'block'; switchModalView('sheet'); } return; }
    if (e.target.closest('#toggle-sell-item-btn')) { e.preventDefault(); e.stopImmediatePropagation(); if (modal) { modal.style.display = 'block'; switchModalView('form'); } return; }
    if (e.target.closest('#close-shop-hub-modal')) { if (modal) modal.style.display = 'none'; return; }
    const tab = e.target.closest('.shop-modal-tab'); if (tab) { switchModalView(tab.getAttribute('data-smview')); return; }
    const del = e.target.closest('.sm-del-row');
    if (del) { const v = loadVault(); v.shopItems.splice(Number(del.getAttribute('data-idx')), 1); saveVault(v); renderModalData(); if (typeof window.renderFinanceShopPrices === 'function') window.renderFinanceShopPrices(); return; }
    if (e.target.closest('#sm-export-csv-btn')) {
      const rows = [['Item Name', 'Category', 'Quantity', 'Notes', 'Price Status']];
      (Array.isArray(loadVault().shopItems) ? loadVault().shopItems : []).forEach((it) => rows.push([`"${it.name}"`, `"${it.category}"`, `"${it.qty}"`, `"${it.note || ''}"`, Number(it.sellPrice || 0) > 0 ? 'Set' : 'Unset']));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })); a.download = 'angaza-shop-stock.csv'; a.click();
    }
  }, true);
  document.getElementById('sm-search-inp')?.addEventListener('input', renderModalData);
  document.getElementById('modal-add-item-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('m-item-name')?.value.trim(), qty = document.getElementById('m-item-qty')?.value.trim();
    if (!name || !qty) return;
    const v = loadVault(); v.shopItems = Array.isArray(v.shopItems) ? v.shopItems : [];
    v.shopItems.unshift({ name, category: document.getElementById('m-item-cat')?.value || 'Ready Clothes', qty, note: document.getElementById('m-item-note')?.value.trim() || '', sellPrice: Math.max(0, Number(document.getElementById('m-item-price')?.value || 0)) });
    saveVault(v); e.target.reset(); switchModalView('sheet');
    if (typeof window.renderFinanceShopPrices === 'function') window.renderFinanceShopPrices();
  });
  renderModalData();
})();

// === V51: SINGLE EXPANDED GROUP + DESIGN DROPDOWN CALCULATOR ===
(function initSingleExpandedCalcDropdown() {
  const sel = document.getElementById('calc-person-group');
  if (!sel) return;

  const specs = {
    woman_straight:  { ph: ['Bust (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 5,  addLen: 0,  trim: 6, hrs: 2.8, name: 'Straight Dress' },
    woman_flared:    { ph: ['Bust (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 18, addLen: 6,  trim: 6, hrs: 3.8, name: 'Flared Dress' },
    woman_suit:      { ph: ['Bust (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Skirt+Top L'], ease: 8,  addLen: 10, trim: 8, hrs: 4.3, name: 'Skirt & Blouse' },
    woman_bridal:    { ph: ['Bust (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 22, addLen: 12, trim: 9, hrs: 5.5, name: 'Ruracio/Bridal' },
    woman_trouser:   { ph: ['Waist (in)', 'Hips (in)', 'Thigh (in)', 'Rise/Crotch', 'Knee/Ankle', 'Outseam L'],   ease: 10, addLen: 8,  trim: 7, hrs: 4.0, name: 'Women Trousers' },
    man_shirt:       { ph: ['Chest (in)', 'Waist (in)', 'Neck/Collar', 'Shoulder', 'Sleeve (in)', 'Shirt Length'], ease: 6,  addLen: 0,  trim: 9, hrs: 3.2, name: 'Official Shirt' },
    man_trouser:     { ph: ['Waist (in)', 'Seat/Hips', 'Thigh (in)', 'Rise/Crotch', 'Bottom Width', 'Trouser L'], ease: 10, addLen: 6,  trim: 8, hrs: 4.0, name: 'Men Trousers' },
    man_kaunda:      { ph: ['Chest (in)', 'Waist (in)', 'Seat/Hips', 'Shoulder', 'Sleeve (in)', 'Top+Trouser L'],ease: 12, addLen: 18, trim: 10,hrs: 5.5, name: 'Kaunda/Senator' },
    man_kanzu:       { ph: ['Chest (in)', 'Waist (in)', 'Neck (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'],  ease: 14, addLen: 6,  trim: 9, hrs: 4.4, name: 'Kanzu Robe' },
    man_blazer:      { ph: ['Chest (in)', 'Waist (in)', 'Seat/Hips', 'Shoulder', 'Sleeve (in)', 'Coat Length'],  ease: 14, addLen: 12, trim: 12,hrs: 5.8, name: 'Blazer / Coat' },
    child_dress:     { ph: ['Chest (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'],  ease: 8,  addLen: 4,  trim: 7, hrs: 2.2, name: 'School Dress' },
    child_set:       { ph: ['Chest (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Shirt+Short L'],ease: 8,  addLen: 8,  trim: 8, hrs: 2.5, name: 'School Set' },
    child_party:     { ph: ['Chest (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'],  ease: 14, addLen: 5,  trim: 7, hrs: 2.6, name: 'Kids Party Dress' },
    child_kitenge:   { ph: ['Chest (in)', 'Waist (in)', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'],  ease: 8,  addLen: 4,  trim: 7, hrs: 2.3, name: 'Kids Kitenge' },
    flow_dera:       { ph: ['Bust/Chest', 'Waist/Ease', 'Hips/Flare', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 14, addLen: 0,  trim: 8, hrs: 2.8, name: 'Classic Dera' },
    flow_kaftan:     { ph: ['Bust/Chest', 'Waist/Ease', 'Hips/Flare', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 18, addLen: 4,  trim: 9, hrs: 4.0, name: 'Kaftan' },
    flow_abaya:      { ph: ['Bust/Chest', 'Waist/Ease', 'Hips/Sweep', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 22, addLen: 6,  trim: 9, hrs: 3.8, name: 'Abaya / Robe' },
    flow_maternity:  { ph: ['Bust (in)', 'Empire/Belly', 'Hips (in)', 'Shoulder', 'Sleeve (in)', 'Full Length'], ease: 20, addLen: 4,  trim: 8, hrs: 3.6, name: 'Maternity Maxi' }
  };

  function updateAll() {
    const cfg = specs[sel.value] || specs.woman_straight;
    ['m-bust', 'm-waist', 'm-hips', 'm-shoulder', 'm-sleeve', 'm-length'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.placeholder = cfg.ph[i];
    });

    const b = Number(document.getElementById('m-bust')?.value || 0);
    const w = Number(document.getElementById('m-waist')?.value || 0);
    const h = Number(document.getElementById('m-hips')?.value || 0);
    const sh = Number(document.getElementById('m-shoulder')?.value || 0);
    const sl = Number(document.getElementById('m-sleeve')?.value || 0);
    const len = Number(document.getElementById('m-length')?.value || 0);
    const roll = Number(document.getElementById('calc-fabric-width')?.value || 45);
    const outFab = document.getElementById('calc-out-fabric');
    const outTime = document.getElementById('calc-out-time');
    if (!outFab || !outTime) return;

    if (!b && !w && !h && !len) {
      outFab.textContent = `Enter ${cfg.name} measurements in inches`;
      outTime.textContent = '--';
      return;
    }

    const isChild = sel.value.startsWith('child_');
    const maxGirth = Math.max(b, w, h, sh * 2.4, isChild ? 24 : 36);
    const twoLengths = (maxGirth + cfg.ease) > (roll - 1.5);
    const gLen = (len > 0 ? len : (isChild ? 28 : 42)) + cfg.addLen;
    const totalIn = (twoLengths ? gLen * 2 : gLen) + (sl > 0 ? sl + 3.5 : 0) + cfg.trim;
    const meters = Math.ceil((totalIn * 0.0254) * 4) / 4;
    const yards = (Math.ceil((totalIn / 36) * 4) / 4).toFixed(2);
    const hrs = cfg.hrs + (gLen >= 52 ? 0.8 : 0) + (sl >= 16 ? 0.6 : sl > 0 ? 0.3 : 0);

    outFab.innerHTML = `<b>${meters.toFixed(2)}m</b> (${yards} yds @ ${roll}")`;
    outTime.textContent = `${cfg.name} · ${twoLengths ? '2× Length' : '1× Width'} · ~${hrs.toFixed(1)} hrs`;
  }

  sel.addEventListener('change', updateAll, true);
  ['m-bust', 'm-waist', 'm-hips', 'm-shoulder', 'm-sleeve', 'm-length', 'calc-fabric-width'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateAll, true);
  });
  updateAll();
})();
