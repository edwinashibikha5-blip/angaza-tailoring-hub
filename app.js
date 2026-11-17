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
    else if (e.target.dataset.printOrd) { const o = v.orders.find((x) => x.id === e.target.dataset.printOrd); if (o) { const bal = Math.max(0, Number(o.price) - Number(o.deposit)); document.getElementById('print-receipt-area').innerHTML = `<h2>ANGAZA TAILORING HUB</h2><p>Tel: +254 106 35228 / +254 725 240629</p><hr/><p><strong>Client:</strong> ${o.clientName}</p><p><strong>Garment:</strong> ${o.style} [${o.category}]</p><p><strong>Total:</strong> ${fmtKES(o.price)} | <strong>Paid:</strong> ${fmtKES(o.deposit)} | <strong>Balance:</strong> ${fmtKES(bal)}</p>`; window.print(); } }
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
