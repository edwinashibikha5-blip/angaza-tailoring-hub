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

// === V25: AUTO DATE, COLLAPSIBLE CLIENTS LIST, MEASUREMENT ESTIMATOR & SHOP ITEMS ===
(function initV25ShopIntelligence() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';
  function loadVault() {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveVault(v) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(v));
  }

  // 1. Automatic live date update in header & default date inputs
  function updateLiveDates() {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
    const pill = document.getElementById('live-date-pill');
    if (pill) pill.textContent = '📅 ' + formatted;

    const isoToday = now.toISOString().split('T');
    document.querySelectorAll('input[type="date"]').forEach((inp) => {
      if (!inp.value && inp.id !== 'order-fitting') {
        inp.value = isoToday;
      }
    });
  }
  updateLiveDates();
  setInterval(updateLiveDates, 60000);

  // 2. Replace "No orders logged yet" empty message with Collapsible Client List & Phone Numbers
  function replaceEmptyOrdersWithClients() {
    const ordersList = document.getElementById('orders-list') || document.querySelector('#tab-orders .stack-list');
    if (!ordersList) return;
    if (!ordersList.textContent.includes('No orders logged yet')) return;

    const vault = loadVault();
    const clients = Array.isArray(vault.clients) ? vault.clients : [];

    ordersList.innerHTML = `
      <div class="card" style="margin-top:8px;padding:12px;">
        <div class="card-head">
          <h4 style="margin:0;color:#1e3a8a;">👥 Client Directory & Contacts (${clients.length})</h4>
          <button type="button" class="btn-small" id="toggle-home-clients-btn">Show</button>
        </div>
        <div id="home-clients-collapse" style="display:none;margin-top:8px;">
          ${clients.length === 0
            ? '<p class="muted-note">No saved clients yet. Tap <b>Clients</b> below to add a client profile.</p>'
            : clients.map((c) => {
                const phone = (c.phone || '').trim();
                const cleanWa = phone.replace(/[^\d]/g, '').replace(/^0/, '254');
                return `
                  <div class="client-quick-row">
                    <div>
                      <strong>${c.name || 'Client'}</strong>
                      <div style="font-size:0.76rem;color:#475569;">${c.group || 'Client'} · ${phone || 'No phone'}</div>
                    </div>
                    ${phone ? `
                      <div class="client-quick-links">
                        <a href="tel:${phone}">📞 Call</a>
                        <a href="https://wa.me{cleanWa}" target="_blank" rel="noopener">💬 WhatsApp</a>
                      </div>` : ''}
                  </div>`;
              }).join('')}
        </div>
      </div>
    `;

    const btn = document.getElementById('toggle-home-clients-btn');
    const body = document.getElementById('home-clients-collapse');
    if (btn && body) {
      btn.addEventListener('click', () => {
        const open = body.style.display === 'none';
        body.style.display = open ? 'block' : 'none';
        btn.textContent = open ? 'Hide' : 'Show';
      });
    }
  }
  setTimeout(replaceEmptyOrdersWithClients, 250);

  // 3. Smart Measurement -> Fabric Yardage & Sewing Time Calculator
  function computeFabricAndTime() {
    const clientForm = document.getElementById('client-form');
    const box = document.getElementById('meas-smart-estimate');
    if (!clientForm || !box) return;

    const text = Array.from(clientForm.querySelectorAll('input, textarea, select'))
      .map((el) => (el.id + ':' + el.value))
      .join(' ')
      .toLowerCase();

    const nums = (text.match(/\d+(\.\d+)?/g) || []).map(Number).filter((n) => n >= 12 && n <= 85);
    if (nums.length < 2) {
      box.style.display = 'none';
      return;
    }

    const maxGirth = Math.max(...nums.filter((n) => n <= 65), 36);
    const maxLen = Math.max(...nums, 40);

    // Calculate fabric in meters & yards based on body girth and garment length
    let meters = 2.0;
    let hours = 3.5;
    let label = 'Standard Outfit';

    if (text.includes('maxi') || text.includes('ruracio') || text.includes('bridal') || text.includes('kaftan') || text.includes('dera') || maxLen >= 52) {
      meters = maxGirth > 44 ? 3.5 : 3.0;
      hours = 6.0;
      label = 'Full-Length Dress / Kaftan';
    } else if (text.includes('suit') || text.includes('kaunda') || text.includes('senator') || text.includes('kanzu')) {
      meters = maxGirth > 44 ? 3.5 : 3.0;
      hours = 5.5;
      label = 'Two-Piece Suit / Kanzu';
    } else if (text.includes('trouser') || text.includes('skirt') || text.includes('shirt')) {
      meters = maxGirth > 42 ? 2.0 : 1.5;
      hours = 2.5;
      label = 'Top / Skirt / Trousers';
    } else if (text.includes('girl') || text.includes('boy') || maxGirth < 30) {
      meters = 1.5;
      hours = 2.0;
      label = 'Kids / Youth Garment';
    } else if (maxGirth > 44) {
      meters = 3.0;
      hours = 4.5;
    }

    const yards = (meters * 1.094).toFixed(1);
    const estFabric = document.getElementById('est-fabric-val');
    const estTime = document.getElementById('est-time-val');
    const estNote = document.getElementById('est-note-val');

    if (estFabric) estFabric.textContent = `${meters.toFixed(1)}m (~${yards} yds at 45")`;
    if (estTime) estTime.textContent = `~${hours} hrs (${hours <= 3 ? 'Same Day' : '1–2 Days'})`;
    if (estNote) estNote.textContent = `Auto-calculated for ${label} (Max girth ~${maxGirth}", Length ~${maxLen}").`;
    box.style.display = 'block';
  }

  const clientFormEl = document.getElementById('client-form');
  if (clientFormEl) {
    clientFormEl.addEventListener('input', computeFabricAndTime);
    clientFormEl.addEventListener('change', computeFabricAndTime);
  }

  // 4. Expanded Shop Overview Summary & Add Items to Sell
  function renderShopOverviewAndStock() {
    const pillsEl = document.getElementById('shop-summary-pills');
    const listEl = document.getElementById('sell-items-list');
    const vault = loadVault();
    const clients = Array.isArray(vault.clients) ? vault.clients : [];
    const orders = Array.isArray(vault.orders) ? vault.orders : [];
    const accessories = Array.isArray(vault.accessories) ? vault.accessories : [];
    const shopItems = Array.isArray(vault.shopItems) ? vault.shopItems : [];

    const readyClothes = orders.filter((o) => o.status === 'Ready').length +
      shopItems.filter((i) => i.category === 'Ready Clothes').length;
    const materialsCount = shopItems.filter((i) => i.category === 'Fabrics & Materials').length;

    if (pillsEl) {
      pillsEl.innerHTML = `
        <span class="summary-chip">👥 Customers: ${clients.length}</span>
        <span class="summary-chip">👗 Clothes: ${readyClothes}</span>
        <span class="summary-chip">🧵 Materials/Fabrics: ${materialsCount}</span>
        <span class="summary-chip">🪡 Accessories: ${accessories.length}</span>
        <span class="summary-chip">🛍️ Items for Sale: ${shopItems.length}</span>
      `;
    }

    if (listEl) {
      if (shopItems.length === 0) {
        listEl.innerHTML = '<p class="muted-note" style="margin:4px 0;">No retail items added yet. Tap <b>+ Add Item to Sell</b> to log clothes, fabrics, or goods.</p>';
      } else {
        listEl.innerHTML = shopItems.map((it, idx) => `
          <div class="acc-item-row">
            <div>
              <strong>${it.name}</strong>
              <div style="font-size:0.75rem;color:#475569;">${it.category} · Qty: <b>${it.qty}</b> ${it.note ? '· ' + it.note : ''}</div>
            </div>
            <button type="button" class="btn-small sell-del-btn" data-idx="${idx}">✕</button>
          </div>
        `).join('');

        listEl.querySelectorAll('.sell-del-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const i = Number(btn.getAttribute('data-idx'));
            const v = loadVault();
            v.shopItems.splice(i, 1);
            saveVault(v);
            renderShopOverviewAndStock();
          });
        });
      }
    }
  }

  const toggleSellBtn = document.getElementById('toggle-sell-item-btn');
  const sellForm = document.getElementById('sell-item-form');
  if (toggleSellBtn && sellForm) {
    toggleSellBtn.addEventListener('click', () => {
      const hidden = sellForm.style.display === 'none';
      sellForm.style.display = hidden ? 'grid' : 'none';
      toggleSellBtn.textContent = hidden ? '− Hide Form' : '+ Add Item to Sell';
    });

    sellForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('sell-name')?.value.trim();
      const category = document.getElementById('sell-cat')?.value || 'Ready Clothes';
      const qty = document.getElementById('sell-qty')?.value.trim();
      const note = document.getElementById('sell-note')?.value.trim() || '';
      if (!name || !qty) return;

      const vault = loadVault();
      vault.shopItems = Array.isArray(vault.shopItems) ? vault.shopItems : [];
      vault.shopItems.unshift({ name, category, qty, note, date: new Date().toISOString().split('T') });
      saveVault(vault);
      sellForm.reset();
      sellForm.style.display = 'none';
      toggleSellBtn.textContent = '+ Add Item to Sell';
      renderShopOverviewAndStock();
    });
  }

  renderShopOverviewAndStock();
})();

// === V26: ZERO-CRASH SHIELD, DUAL-VAULT BACKUP, SECURITY & SELF-REFRESH ===
(function initEnterpriseResilienceEngine() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';
  const SNAPSHOT_KEY = 'angaza_daily_auto_snapshot_v1';

  // 1. Global Crash Shield — prevents any unexpected error from freezing the UI
  window.addEventListener('error', (e) => {
    console.warn('[Angaza Shield] Isolated runtime error:', e.message);
    e.preventDefault();
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.warn('[Angaza Shield] Isolated async warning:', e.reason);
    e.preventDefault();
  });

  // 2. IndexedDB Redundant Mirror + Daily Auto-Snapshot
  function openMirrorDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open('AngazaVaultMirrorDB', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('vault')) db.createObjectStore('vault');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  async function mirrorToIndexedDB(rawJson) {
    try {
      const db = await openMirrorDB();
      if (!db || !rawJson) return;
      const tx = db.transaction('vault', 'readwrite');
      tx.objectStore('vault').put(rawJson, 'latest_backup');
    } catch (e) {}
  }

  async function restoreFromIndexedDBIfNeeded() {
    try {
      const current = localStorage.getItem(VAULT_KEY);
      if (current && current.length > 20) {
        mirrorToIndexedDB(current);
        return;
      }
      const db = await openMirrorDB();
      if (!db) return;
      const tx = db.transaction('vault', 'readonly');
      const getReq = tx.objectStore('vault').get('latest_backup');
      getReq.onsuccess = () => {
        if (getReq.result && typeof getReq.result === 'string' && getReq.result.length > 20) {
          localStorage.setItem(VAULT_KEY, getReq.result);
          window.location.reload();
        }
      };
    } catch (e) {}
  }
  restoreFromIndexedDBIfNeeded();

  // Intercept localStorage.setItem to auto-mirror and keep daily rolling backup
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, val) {
    origSetItem(key, val);
    if (key === VAULT_KEY && typeof val === 'string') {
      mirrorToIndexedDB(val);
      try {
        const today = new Date().toISOString().split('T');
        const snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
        if (snap.date !== today) {
          origSetItem(SNAPSHOT_KEY, JSON.stringify({ date: today, data: val }));
        }
      } catch (e) {}
    }
  };

  // 3. Auto-Lock Finance Tab on App Backgrounding or 3-Minute Idle
  let financeIdleTimer = null;
  function lockFinanceSilently() {
    const unlocked = document.getElementById('finance-unlocked');
    const locked = document.getElementById('finance-locked') || document.getElementById('pin-lock-screen');
    if (unlocked && unlocked.style.display !== 'none') {
      unlocked.style.display = 'none';
      if (locked) locked.style.display = 'block';
    }
  }

  function resetFinanceTimer() {
    clearTimeout(financeIdleTimer);
    financeIdleTimer = setTimeout(lockFinanceSilently, 180000);
  }

  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, resetFinanceTimer, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lockFinanceSilently();
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => { if (reg) reg.update(); });
    }
  });

  // 4. Silent Self-Refreshing Service Worker Activation
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    setInterval(() => {
      if (navigator.onLine) {
        navigator.serviceWorker.getRegistration().then((reg) => { if (reg) reg.update(); });
      }
    }, 300000);
  }
})();

// === V28: COLLAPSIBLE SHOP OVERVIEW & CLEAR REFRESH FEEDBACK ===
(function initV28Polish() {
  const toggleOvBtn = document.getElementById('toggle-overview-collapse-btn');
  const ovBody = document.getElementById('overview-collapse-body');
  if (toggleOvBtn && ovBody) {
    toggleOvBtn.addEventListener('click', () => {
      const hidden = ovBody.style.display === 'none';
      ovBody.style.display = hidden ? 'block' : 'none';
      toggleOvBtn.textContent = hidden ? 'Hide' : 'Show';
    });
  }

  // Show confirmation toast if reloaded via Refresh button
  if (window.location.search.includes('v=')) {
    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.textContent = '✅ App Refreshed & Up to Date';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2600);
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
})();

// === V29: RELIABLE "+ ADD ITEM TO SELL" & CLIENT-TAB ORDER JUMP ===
(function initV29Fixes() {
  const VAULT_KEY = 'angaza_atelier_vault_v2';
  function loadVault() {
    try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveVault(v) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(v));
  }

  // Event-delegated "+ Add Item to Sell" toggle so it always responds on first tap
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#toggle-sell-item-btn');
    if (toggleBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const form = document.getElementById('sell-item-form');
      if (form) {
        const isClosed = form.style.display === 'none' || getComputedStyle(form).display === 'none';
        form.style.display = isClosed ? 'grid' : 'none';
        toggleBtn.textContent = isClosed ? '− Hide Form' : '+ Add Item to Sell';
      }
    }

    // Jump Custom Tailoring tile directly to Clients tab where New Custom Order now lives
    const customTile = e.target.closest('[data-jump="orders-form"]');
    if (customTile) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const clientsNav = document.querySelector('[data-tab="clients"]') ||
                         document.querySelector('[data-target="tab-clients"]');
      if (clientsNav) clientsNav.click();
      setTimeout(() => {
        const form = document.getElementById('order-form');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, true);

  // Ensure saving a sellable item works reliably and updates chips immediately
  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'sell-item-form') {
      e.preventDefault();
      e.stopImmediatePropagation();
      const name = document.getElementById('sell-name')?.value.trim();
      const category = document.getElementById('sell-cat')?.value || 'Ready Clothes';
      const qty = document.getElementById('sell-qty')?.value.trim();
      const note = document.getElementById('sell-note')?.value.trim() || '';
      if (!name || !qty) return;

      const vault = loadVault();
      vault.shopItems = Array.isArray(vault.shopItems) ? vault.shopItems : [];
      vault.shopItems.unshift({ name, category, qty, note, date: new Date().toISOString().split('T') });
      saveVault(vault);

      e.target.reset();
      e.target.style.display = 'none';
      const btn = document.getElementById('toggle-sell-item-btn');
      if (btn) btn.textContent = '+ Add Item to Sell';

      // Refresh pills and list immediately
      const pillsEl = document.getElementById('shop-summary-pills');
      const listEl = document.getElementById('sell-items-list');
      const clients = Array.isArray(vault.clients) ? vault.clients : [];
      const orders = Array.isArray(vault.orders) ? vault.orders : [];
      const accessories = Array.isArray(vault.accessories) ? vault.accessories : [];
      const shopItems = vault.shopItems;
      const readyClothes = orders.filter((o) => o.status === 'Ready').length +
        shopItems.filter((i) => i.category === 'Ready Clothes').length;
      const materialsCount = shopItems.filter((i) => i.category === 'Fabrics & Materials').length;

      if (pillsEl) {
        pillsEl.innerHTML = `
          <span class="summary-chip">👥 Customers: ${clients.length}</span>
          <span class="summary-chip">👗 Clothes: ${readyClothes}</span>
          <span class="summary-chip">🧵 Materials/Fabrics: ${materialsCount}</span>
          <span class="summary-chip">🪡 Accessories: ${accessories.length}</span>
          <span class="summary-chip">🛍️ Items for Sale: ${shopItems.length}</span>
        `;
      }
      if (listEl) {
        listEl.innerHTML = shopItems.map((it, idx) => `
          <div class="acc-item-row">
            <div>
              <strong>${it.name}</strong>
              <div style="font-size:0.78rem;color:#334155;">${it.category} · Qty: <b>${it.qty}</b> ${it.note ? '· ' + it.note : ''}</div>
            </div>
            <button type="button" class="btn-small sell-del-btn" data-idx="${idx}">✕</button>
          </div>
        `).join('');
      }
    }
  }, true);
})();

// === V32: LIVE VERSION BADGE & AUTOMATIC DEPLOYMENT DETECTOR ===
(function initAutoDeployWatcher() {
  const CURRENT_VER = 'v32';

  // Display subtle version tag beside live date or header so you always know which build is active
  const datePill = document.getElementById('live-date-pill');
  if (datePill && !datePill.textContent.includes(CURRENT_VER)) {
    datePill.textContent = datePill.textContent + ' · ' + CURRENT_VER;
  }

  // Poll index.html with cache-bypass every 25s when online; auto-reload the instant Render publishes a newer build
  setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch('./index.html?ping=' + Date.now(), { cache: 'no-store' });
      const text = await res.text();
      const match = text.match(/style\.css\?v=(\d+)/);
      if (match && ('v' + match) !== CURRENT_VER) {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        window.location.replace(window.location.pathname + '?v=' + match + '&t=' + Date.now());
      }
    } catch (e) {}
  }, 25000);
})();

// === V35: DIRECT NAVIGATION FOR ALL 4 HOME TILES & LIVE AUTO-CALCULATOR ===
(function initV35TilesAndCalculator() {
  // Helper: click bottom nav button by matching its text label (Orders, Repairs, Clients, Catalog, Finance)
  function switchToNavLabel(labelWord) {
    const navButtons = Array.from(document.querySelectorAll('nav button, .nav button, [role="tab"]'));
    const match = navButtons.find((b) => b.textContent.toLowerCase().includes(labelWord.toLowerCase()));
    if (match) {
      match.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    return false;
  }

  // Wire the 4 Home Quick-Action Tiles reliably
  document.addEventListener('click', (e) => {
    const tile = e.target.closest('.hub-tile');
    if (!tile) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const jump = tile.getAttribute('data-jump') || '';
    if (jump === 'orders-form') {
      // 1. Custom Tailoring -> Opens Clients tab & scrolls to New Custom Order form
      switchToNavLabel('Clients');
      setTimeout(() => {
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
          orderForm.classList.add('is-open');
          orderForm.style.display = 'grid';
          orderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else if (jump === 'tab-gallery') {
      // 2. Fashion Design -> Opens Catalog tab (Style search, Yardage helper & Gallery)
      switchToNavLabel('Catalog');
    } else if (jump === 'tab-repairs') {
      // 3. Resizing & Fixes -> Opens Repairs tab
      switchToNavLabel('Repairs');
    } else if (jump === 'accessories-panel') {
      // 4. Sewing Accessories -> Opens the Sewing Accessories & Shop Stock drawer right below
      const accPanel = document.getElementById('accessories-panel');
      if (accPanel) {
        accPanel.style.display = 'block';
        accPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, true);

  // Live Auto Fabric & Sewing Time Calculator inside Clients tab
  function runAutoFabricTimeCalc() {
    const typeEl = document.getElementById('calc-garment-type');
    const widthEl = document.getElementById('calc-fabric-width');
    const girthEl = document.getElementById('calc-girth');
    const lenEl = document.getElementById('calc-length');
    const outFab = document.getElementById('calc-out-fabric');
    const outTime = document.getElementById('calc-out-time');
    if (!typeEl || !outFab || !outTime) return;

    const gType = typeEl.value;
    const fWidth = Number(widthEl?.value || 45);
    const girth = Number(girthEl?.value || 0);
    const len = Number(lenEl?.value || 0);

    if (!girth && !len) {
      outFab.textContent = 'Enter girth & length above';
      outTime.textContent = '--';
      return;
    }

    const effectiveGirth = girth || 38;
    const effectiveLen = len || 42;

    let baseMeters = 2.0;
    let hours = 3.5;

    if (gType === 'maxi') { baseMeters = 3.0; hours = 6.0; }
    else if (gType === 'suit') { baseMeters = 3.0; hours = 5.5; }
    else if (gType === 'top') { baseMeters = 1.5; hours = 2.5; }
    else if (gType === 'kids') { baseMeters = 1.5; hours = 2.0; }

    if (effectiveGirth > 44) { baseMeters += 0.5; hours += 0.5; }
    if (effectiveLen > 50) { baseMeters += 0.5; hours += 0.5; }
    if (fWidth === 60) { baseMeters = Math.max(1.25, baseMeters - 0.5); }

    const yards = (baseMeters * 1.094).toFixed(1);
    outFab.textContent = `${baseMeters.toFixed(2)} meters (~${yards} yards at ${fWidth}")`;
    outTime.textContent = `~${hours.toFixed(1)} hrs (${hours <= 3 ? 'Same Day' : '1–2 Days'})`;
  }

  ['calc-garment-type', 'calc-fabric-width', 'calc-girth', 'calc-length'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', runAutoFabricTimeCalc);
      el.addEventListener('change', runAutoFabricTimeCalc);
    }
  });
})();
