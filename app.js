(function () {
  'use strict';

  const VAULT_KEY = 'angaza_tailoring_hub_v1';
  const DB_NAME = 'AngazaTailoringHubDB';
  let pendingOrderPhoto = '';

  function loadVault() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(VAULT_KEY) || '{}'); } catch (e) {}
    if (!Array.isArray(v.clients)) v.clients = [];
    if (!Array.isArray(v.orders)) v.orders = [];
    if (!Array.isArray(v.expenses)) v.expenses = [];
    if (!v.pin) v.pin = '1234';
    return v;
  }

  function saveVault(v) {
    try {
      const raw = JSON.stringify(v);
      localStorage.setItem(VAULT_KEY, raw);
      localStorage.setItem(VAULT_KEY + '_bak', raw);
    } catch (e) {}
  }

  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('gallery')) db.createObjectStore('gallery', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fabrics')) db.createObjectStore('fabrics', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function dbPut(store, item) {
    const db = await openDB();
    return new Promise(res => {
      const tx = db.transaction([store], 'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = () => res();
    });
  }

  async function dbAll(store) {
    const db = await openDB();
    return new Promise(res => {
      const tx = db.transaction([store], 'readonly');
      const rq = tx.objectStore(store).getAll();
      rq.onsuccess = () => res(rq.result || []);
      rq.onerror = () => res([]);
    });
  }

  async function dbDel(store, id) {
    const db = await openDB();
    return new Promise(res => {
      const tx = db.transaction([store], 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => res();
    });
  }

  function compressImg(file, maxDim, q) {
    return new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else { w = Math.round((w * maxDim) / h); h = maxDim; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', q));
        };
        img.onerror = rej;
        img.src = ev.target.result;
      };
      rd.readAsDataURL(file);
    });
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function waPhone(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.startsWith('254')) return d;
    if (d.startsWith('0') && d.length === 10) return '254' + d.slice(1);
    return d;
  }
  async function renderAll() {
    const v = loadVault();
    const sel = document.getElementById('ord-client');
    sel.innerHTML = v.clients.length
      ? v.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.phone)})</option>`).join('')
      : `<option value="">-- Add Client in "Clients & OCR" first --</option>`;

    document.getElementById('orders-list').innerHTML = v.orders.length ? v.orders.slice().reverse().map(o => {
      const cl = v.clients.find(c => c.id === o.clientId) || { name: 'Client', phone: '' };
      const bal = Math.max(0, Number(o.price) - Number(o.deposit));
      const phone = waPhone(cl.phone);
      const waMsg = `Hello ${cl.name}, your ${o.garment} at ANGAZA TAILORING HUB is ${o.status}. Balance: KES ${bal.toLocaleString()}. Contacts: +25410635228 / +254725240629.`;
      return `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;"><strong>${esc(o.garment)} — ${esc(cl.name)}</strong><span style="color:#f472b6;font-size:11px;font-weight:700;">${esc(o.status)}</span></div>
          <div style="font-size:11.5px;color:#94a3b8;margin-top:3px;">Due: ${esc(o.due)} • Total: KES ${Number(o.price).toLocaleString()} • Bal: <strong style="color:#f59e0b;">KES ${bal.toLocaleString()}</strong></div>
          ${o.photo ? `<img src="${o.photo}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-top:6px;" />` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;">
            <select data-st="${esc(o.id)}" style="width:auto;padding:4px 7px;font-size:11px;">
              ${['Cutting', 'Sewing', 'Fitting', 'Ready', 'Delivered'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            ${phone ? `<a href="https://wa.me{phone}?text=${encodeURIComponent(waMsg)}" target="_blank" style="background:#16a34a;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">WhatsApp</a>` : ''}
            <button type="button" class="btn btn-dark" data-rec="${esc(o.id)}" style="padding:4px 8px;font-size:11px;">Receipt</button>
          </div>
        </div>`;
    }).join('') : `<div style="font-size:12px;color:#94a3b8;">No orders logged yet.</div>`;

    const q = (document.getElementById('client-search').value || '').toLowerCase();
    document.getElementById('clients-list').innerHTML = v.clients.filter(c => (c.name + c.phone).toLowerCase().includes(q)).slice().reverse().map(c => {
      const m = c.m || {};
      return `<div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:9px;margin-bottom:7px;">
        <div style="display:flex;justify-content:space-between;"><strong style="color:#f472b6;">${esc(c.name)}</strong><span style="font-size:11px;color:#38bdf8;">${esc(c.phone)}</span></div>
        <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">B:${esc(m.bust||'-')} W:${esc(m.waist||'-')} H:${esc(m.hips||'-')} Sh:${esc(m.shoulder||'-')} Sl:${esc(m.sleeve||'-')} N:${esc(m.neck||'-')} Top:${esc(m.top||'-')} Dr:${esc(m.dress||'-')} Bot:${esc(m.bottom||'-')}</div>
      </div>`;
    }).join('');

    const gal = await dbAll('gallery');
    document.getElementById('gal-grid').innerHTML = gal.slice().reverse().map(g => `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;overflow:hidden;">
        <img src="${g.photo}" style="width:100%;height:140px;object-fit:cover;" />
        <div style="padding:6px;font-size:11.5px;"><strong>${esc(g.title)}</strong> <button type="button" data-dgal="${esc(g.id)}" style="float:right;background:#7f1d1d;color:#fff;border:none;border-radius:4px;font-size:10px;">×</button></div>
      </div>`).join('');

    const fabs = await dbAll('fabrics');
    document.getElementById('fab-grid').innerHTML = fabs.slice().reverse().map(f => `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;overflow:hidden;">
        ${f.photo ? `<img src="${f.photo}" style="width:100%;height:110px;object-fit:cover;" />` : `<div style="height:50px;background:${esc(f.hex)};"></div>`}
        <div style="padding:6px;font-size:11px;"><strong>${esc(f.name)}</strong> (${esc(f.palette)}) <button type="button" data-dfab="${esc(f.id)}" style="float:right;background:#7f1d1d;color:#fff;border:none;border-radius:4px;font-size:10px;">×</button></div>
      </div>`).join('');

    const rev = v.orders.reduce((s, o) => s + Number(o.price || 0), 0);
    const bal = v.orders.reduce((s, o) => s + Math.max(0, Number(o.price || 0) - Number(o.deposit || 0)), 0);
    const exp = v.expenses.reduce((s, x) => s + Number(x.cost || 0), 0);
    document.getElementById('fin-kpis').innerHTML = `Booked: <strong style="color:#38bdf8;">KES ${rev.toLocaleString()}</strong> • Balance Due: <strong style="color:#f59e0b;">KES ${bal.toLocaleString()}</strong> • Expenses: <strong style="color:#f87171;">KES ${exp.toLocaleString()}</strong> • Net: <strong style="color:#10b981;">KES ${(rev - exp).toLocaleString()}</strong>`;
    document.getElementById('exp-list').innerHTML = v.expenses.slice().reverse().slice(0, 6).map(x => `<div style="font-size:11px;color:#cbd5e1;">${esc(x.item)}: KES ${Number(x.cost).toLocaleString()}</div>`).join('');
  }
  function calcProj() {
    const o = Number(document.getElementById('p-ord').value || 0);
    const p = Number(document.getElementById('p-price').value || 0);
    const c = Number(document.getElementById('p-cost').value || 0);
    const h = Number(document.getElementById('p-ovh').value || 0);
    const mNet = (o * p) - (o * c) - h;
    document.getElementById('proj-res').innerHTML = `Monthly Revenue: <strong>KES ${(o * p).toLocaleString()}</strong> • Monthly Net: <strong style="color:#10b981;">KES ${mNet.toLocaleString()}</strong> • 12-Mo Expansion Net: <strong style="color:#f59e0b;">KES ${(mNet * 12).toLocaleString()}</strong>`;
  }

  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-nav]').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById(b.getAttribute('data-nav')).classList.add('active');
  }));

  document.getElementById('ocr-photo').addEventListener('change', async e => {
    const f = e.target.files && e.target.files;
    if (!f) return;
    const msg = document.getElementById('ocr-msg');
    msg.textContent = 'Reading handwritten numbers...';
    try {
      const url = await compressImg(f, 1100, 0.85);
      if (!window.Tesseract) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://jsdelivr.net';
          s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
      }
      const r = await window.Tesseract.recognize(url, 'eng');
      const nums = (r.data.text || '').match(/\b\d{2}(?:\.\d)?\b/g) || [];
      ['m-bust','m-waist','m-hips','m-shoulder','m-sleeve','m-neck','m-top','m-dress','m-bottom'].forEach((id, i) => { if (nums[i]) document.getElementById(id).value = nums[i]; });
      msg.textContent = nums.length ? `Extracted ${nums.length} numbers. Verify & save.` : 'Enter numbers below.';
    } catch (err) { msg.textContent = 'Enter numbers below.'; }
  });

  document.getElementById('client-form').addEventListener('submit', e => {
    e.preventDefault();
    const v = loadVault();
    v.clients.push({
      id: 'c_' + Date.now(), name: document.getElementById('cl-name').value.trim(), phone: document.getElementById('cl-phone').value.trim(),
      m: { bust: document.getElementById('m-bust').value, waist: document.getElementById('m-waist').value, hips: document.getElementById('m-hips').value, shoulder: document.getElementById('m-shoulder').value, sleeve: document.getElementById('m-sleeve').value, neck: document.getElementById('m-neck').value, top: document.getElementById('m-top').value, dress: document.getElementById('m-dress').value, bottom: document.getElementById('m-bottom').value }
    });
    saveVault(v); e.target.reset(); renderAll();
  });

  document.getElementById('ord-photo').addEventListener('change', async e => {
    if (e.target.files && e.target.files) pendingOrderPhoto = await compressImg(e.target.files, 640, 0.72);
  });

  document.getElementById('order-form').addEventListener('submit', e => {
    e.preventDefault();
    const cid = document.getElementById('ord-client').value;
    if (!cid) return;
    const v = loadVault();
    v.orders.push({
      id: 'o_' + Date.now(), clientId: cid, garment: document.getElementById('ord-garment').value.trim(),
      price: Number(document.getElementById('ord-price').value), deposit: Number(document.getElementById('ord-deposit').value),
      due: document.getElementById('ord-due').value, status: document.getElementById('ord-status').value, photo: pendingOrderPhoto
    });
    pendingOrderPhoto = ''; saveVault(v); e.target.reset(); renderAll();
  });

  document.getElementById('orders-list').addEventListener('change', e => {
    const id = e.target.getAttribute('data-st');
    if (!id) return;
    const v = loadVault(); const o = v.orders.find(x => x.id === id);
    if (o) { o.status = e.target.value; saveVault(v); renderAll(); }
  });

  document.getElementById('orders-list').addEventListener('click', e => {
    const id = e.target.getAttribute('data-rec');
    if (!id) return;
    const v = loadVault(); const o = v.orders.find(x => x.id === id);
    const cl = v.clients.find(c => c.id === o.clientId) || { name: 'Client', phone: '' };
    const area = document.getElementById('print-receipt-area');
    area.style.display = 'block';
    area.innerHTML = `<h2>ANGAZA TAILORING HUB — Order Receipt</h2><p>Contacts: +254 106 35228 • +254 725 240629</p><p>Client: ${esc(cl.name)} (${esc(cl.phone)})</p><p>Garment: ${esc(o.garment)} | Due: ${esc(o.due)} | Total: KES ${Number(o.price).toLocaleString()} | Paid: KES ${Number(o.deposit).toLocaleString()}</p>`;
    window.print();
    setTimeout(() => { area.style.display = 'none'; }, 400);
  });

  document.getElementById('gal-photo').addEventListener('change', async e => {
    if (!e.target.files || !e.target.files) return;
    const photo = await compressImg(e.target.files, 1080, 0.85);
    await dbPut('gallery', { id: 'g_' + Date.now(), title: document.getElementById('gal-title').value.trim() || 'Finished Outfit', photo });
    document.getElementById('gal-title').value = ''; renderAll();
  });

  document.getElementById('fab-photo').addEventListener('change', async e => {
    if (!e.target.files || !e.target.files) return;
    const photo = await compressImg(e.target.files, 1080, 0.85);
    await dbPut('fabrics', { id: 'f_' + Date.now(), name: document.getElementById('fab-name').value.trim() || 'Fabric', palette: document.getElementById('fab-palette').value.trim() || 'Shade', hex: document.getElementById('fab-hex').value, photo });
    document.getElementById('fab-name').value = ''; renderAll();
  });

  document.getElementById('gal-grid').addEventListener('click', async e => { const id = e.target.getAttribute('data-dgal'); if (id) { await dbDel('gallery', id); renderAll(); } });
  document.getElementById('fab-grid').addEventListener('click', async e => { const id = e.target.getAttribute('data-dfab'); if (id) { await dbDel('fabrics', id); renderAll(); } });

  document.getElementById('pin-btn').addEventListener('click', () => {
    if (document.getElementById('pin-in').value.trim() === loadVault().pin) {
      document.getElementById('fin-lock').style.display = 'none';
      document.getElementById('fin-open').style.display = 'block';
      calcProj();
    }
  });
  document.getElementById('pin-lock-btn').addEventListener('click', () => {
    document.getElementById('fin-lock').style.display = 'block';
    document.getElementById('fin-open').style.display = 'none';
  });
  document.getElementById('save-pin').addEventListener('click', () => {
    const np = document.getElementById('new-pin').value.trim();
    if (np.length >= 4) { const v = loadVault(); v.pin = np; saveVault(v); document.getElementById('new-pin').value = ''; }
  });
  ['p-ord','p-price','p-cost','p-ovh'].forEach(id => document.getElementById(id).addEventListener('input', calcProj));
  document.getElementById('exp-form').addEventListener('submit', e => {
    e.preventDefault(); const v = loadVault();
    v.expenses.push({ item: document.getElementById('exp-item').value.trim(), cost: Number(document.getElementById('exp-cost').value) });
    saveVault(v); e.target.reset(); renderAll();
  });
  document.getElementById('client-search').addEventListener('input', renderAll);
  document.getElementById('btn-backup').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(loadVault(), null, 2)], { type: 'application/json' }));
    a.download = 'angaza-tailoring-hub-backup.json'; a.click();
  });

  renderAll();
})();
