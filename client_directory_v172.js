(function(){
  const KEY='angaza_atelier_vault_v2', BK='angaza_atelier_backup_latest';
  const getV=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return {};}};
  const saveV=(v)=>{const s=JSON.stringify(v);localStorage.setItem(KEY,s);localStorage.setItem(BK,s);};

  window.angazaDelClient = function(idx){
    const v=getV(), c=(v.clients||[])[idx];
    if(!c || !confirm('Delete "'+(c.name||'client')+'" permanently?')) return;
    v.clients.splice(idx,1); saveV(v);
    document.getElementById('v172-modal')?.remove();
    window.angazaRenderDir();
    if(typeof renderAll==='function') renderAll();
  };

  window.angazaOpenClient = function(idx){
    const c=(getV().clients||[])[idx]; if(!c) return;
    let mBox=document.getElementById('v172-modal');
    if(!mBox){
      mBox=document.createElement('div'); mBox.id='v172-modal';
      mBox.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px';
      mBox.onclick=e=>{if(e.target===mBox) mBox.remove();};
      document.body.appendChild(mBox);
    }
    const ms=c.meas||c||{};
    const list=[['Bust/Chest',ms.chest||ms.B],['Waist',ms.waist||ms.W],['Hips',ms.hips||ms.H],['Shoulder',ms.shoulder||ms.Sh],['Sleeve',ms.sleeve||ms.Slv||ms.Sl],['Full Len',ms.length||ms.FL],['Trouser/Skirt',ms.outseam||ms.Tr],['Neck/Thigh',ms.neck||ms.Nk]].filter(x=>x&&String(x).trim());
    const grid=list.length?list.map(x=>'<div style="display:flex;justify-content:space-between;padding:7px 9px;background:#f8fafc;border-radius:8px"><span>'+x+'</span><b>'+x+' '+(c.unit||'in')+'</b></div>').join(''):'<div style="color:#64748b">No measurements saved</div>';
    mBox.innerHTML='<div style="background:#fff;border-radius:16px;max-width:400px;width:100%;padding:18px;box-shadow:0 20px 40px rgba(0,0,0,.4)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:19px;color:#0f172a">'+(c.name||'Client')+'</h3><span style="background:#e0e7ff;color:#3730a3;padding:2px 9px;border-radius:99px;font-size:12px">'+(c.group||'Women')+'</span></div>'
      +(c.phone?'<div style="font-size:13px;color:#475569;margin-top:4px">📞 '+c.phone+'</div>':'')
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0;font-size:13px">'+grid+'</div>'
      +(c.notes?'<div style="background:#fef9c3;color:#854d0e;padding:8px 10px;border-radius:8px;font-size:13px">📝 '+c.notes+'</div>':'')
      +'<div style="display:flex;gap:8px;margin-top:14px">'
      +'<button type="button" onclick="angazaDelClient('+idx+')" style="padding:10px 12px;border:none;border-radius:10px;background:#fee2e2;color:#b91c1c;font-weight:700">🗑️ Delete</button>'
      +'<button type="button" onclick="document.getElementById(\'v172-modal\').remove();document.getElementById(\'m-chest\')?.scrollIntoView({behavior:\'smooth\'})" style="flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:600">Edit</button>'
      +'<button type="button" onclick="document.getElementById(\'v172-modal\').remove()" style="flex:1;padding:10px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-weight:700">Done</button></div></div>';
  };

  window.angazaRenderDir = function(){
    const box=document.getElementById('v128-cli-dir'); if(!box) return;
    const v=getV(), all=Array.isArray(v.clients)?v.clients:[];
    const ordered=[...all.filter(c=>String(c.id||'').startsWith('bk_')), ...all.filter(c=>!String(c.id||'').startsWith('bk_'))];
    if(JSON.stringify(ordered)!==JSON.stringify(all)){ v.clients=ordered; saveV(v); }
    box.innerHTML=ordered.map((c,i)=>{
      const ms=c.meas||c||{};
      const summary=[['B',ms.chest],['W',ms.waist],['H',ms.hips],['Sh',ms.shoulder],['Sl',ms.sleeve],['FL',ms.length]].filter(([,val])=>val).map(([k,val])=>k+':'+val).join(' · ');
      return '<div style="display:flex;gap:8px;align-items:center;padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px">'
        +'<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:700;color:#0f172a">'+(c.name||'Client')+' <span style="background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:99px;font-size:.7rem;font-weight:600">'+(c.group||'Women')+'</span></div>'
        +(c.phone?'<div style="font-size:.74rem;color:#475569">'+c.phone+'</div>':'')
        +'<div style="font-size:.74rem;color:#1e40af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(summary||c.notes||'No measurements')+'</div></div>'
        +'<button type="button" onclick="angazaOpenClient('+i+')" style="padding:6px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font-weight:700;font-size:.78rem">Load</button></div>';
    }).join('');
  };
  setInterval(window.angazaRenderDir, 800);
  window.addEventListener('load', window.angazaRenderDir);
})();
