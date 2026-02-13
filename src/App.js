import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// APD SPORT — Full PWA App
// Admin: admin@apdsport.com / APD2026!Sport
// ============================================================

const B = {
  black: "#0A0A0A", dark: "#141414", card: "#1C1C1E", cardH: "#252528",
  accent: "#00E676", accentD: "#00C853", accentG: "rgba(0,230,118,0.15)", accentG2: "rgba(0,230,118,0.08)",
  orange: "#FF6D00", orangeG: "rgba(255,109,0,0.15)",
  white: "#FFF", g100: "#F5F5F5", g300: "#B0B0B0", g500: "#6B6B6B", g700: "#3A3A3A", g800: "#2A2A2A",
  danger: "#FF4444", dangerG: "rgba(255,68,68,0.15)", warn: "#FFB300",
};

// ============================================================
// LOCAL DB — localStorage persistence
// ============================================================
const DB = {
  get: (key, def = null) => { try { const v = localStorage.getItem(`apd_${key}`); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (key, val) => { try { localStorage.setItem(`apd_${key}`, JSON.stringify(val)); } catch {} },
  
  initAdmin() {
    const users = DB.get('users', []);
    if (!users.find(u => u.email === 'admin@apdsport.com')) {
      users.push({ id: 'admin_1', name: 'Pablo', email: 'admin@apdsport.com', password: 'APD2026!Sport', role: 'admin', sport: '', phone: '', createdAt: new Date().toISOString() });
      DB.set('users', users);
    }
  },

  register(name, email, password, phone, sport) {
    const users = DB.get('users', []);
    if (users.find(u => u.email === email)) return { error: 'Este email ya está registrado' };
    const user = { id: `user_${Date.now()}`, name, email, password, phone, sport, role: 'client', createdAt: new Date().toISOString() };
    users.push(user);
    DB.set('users', users);
    return { user };
  },

  login(email, password) {
    const users = DB.get('users', []);
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { error: 'Email o contraseña incorrectos' };
    return { user };
  },

  getClients() {
    return DB.get('users', []).filter(u => u.role === 'client');
  },

  getMessages(chatId) {
    return DB.get(`msgs_${chatId}`, []);
  },

  sendMessage(chatId, from, text) {
    const msgs = DB.get(`msgs_${chatId}`, []);
    const msg = { id: `m_${Date.now()}`, from, text, time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), date: new Date().toLocaleDateString('es-ES'), ts: Date.now() };
    msgs.push(msg);
    DB.set(`msgs_${chatId}`, msgs);
    // Add notification
    const notifs = DB.get('notifications', []);
    const users = DB.get('users', []);
    const sender = users.find(u => u.id === from);
    notifs.unshift({ id: `n_${Date.now()}`, type: 'message', from: from, fromName: sender?.name || 'Usuario', chatId, text: text.substring(0, 60), ts: Date.now(), read: false });
    DB.set('notifications', notifs);
    return msg;
  },

  sendBroadcast(fromId, text, recipientIds) {
    recipientIds.forEach(rid => {
      const chatId = [fromId, rid].sort().join('_');
      DB.sendMessage(chatId, fromId, `📢 DIFUSIÓN: ${text}`);
    });
  },

  submitFeedback(userId, data) {
    const feedbacks = DB.get(`feedback_${userId}`, []);
    const fb = { id: `fb_${Date.now()}`, ...data, ts: Date.now(), date: new Date().toLocaleDateString('es-ES') };
    feedbacks.push(fb);
    DB.set(`feedback_${userId}`, feedbacks);
    const notifs = DB.get('notifications', []);
    const users = DB.get('users', []);
    const user = users.find(u => u.id === userId);
    notifs.unshift({ id: `n_${Date.now()}`, type: 'feedback', from: userId, fromName: user?.name || 'Cliente', ts: Date.now(), read: false });
    DB.set('notifications', notifs);
    return fb;
  },

  getFeedbacks(userId) {
    return DB.get(`feedback_${userId}`, []);
  },

  submitTrainingMod(userId, data) {
    const mods = DB.get(`mods_${userId}`, []);
    const mod = { id: `mod_${Date.now()}`, ...data, ts: Date.now(), date: new Date().toLocaleDateString('es-ES') };
    mods.push(mod);
    DB.set(`mods_${userId}`, mods);
    const notifs = DB.get('notifications', []);
    const users = DB.get('users', []);
    const user = users.find(u => u.id === userId);
    notifs.unshift({ id: `n_${Date.now()}`, type: 'training_mod', from: userId, fromName: user?.name || 'Cliente', ts: Date.now(), read: false });
    DB.set('notifications', notifs);
    return mod;
  },

  getTrainingMods(userId) {
    return DB.get(`mods_${userId}`, []);
  },

  getNotifications(forRole, userId) {
    const all = DB.get('notifications', []);
    if (forRole === 'admin') return all.filter(n => n.from !== 'admin_1');
    return all.filter(n => {
      if (n.type === 'message' && n.from !== userId) {
        const chatId = [userId, 'admin_1'].sort().join('_');
        return n.chatId === chatId;
      }
      return false;
    });
  },

  getUnreadCount(forRole, userId) {
    return DB.getNotifications(forRole, userId).filter(n => !n.read).length;
  }
};

// ============================================================
// ICONS
// ============================================================
const I = ({ n, s = 22, c = B.white }) => {
  const d = {
    back: <path d="M19 12H5M12 19l-7-7 7-7"/>,
    send: <><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={c} stroke="none"/>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    right: <polyline points="9 18 15 12 9 6"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    broadcast: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={c} stroke="none"/>,
  };
  if (n === 'zap' || n === 'star') return <svg width={s} height={s} viewBox="0 0 24 24">{d[n]}</svg>;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d[n]}</svg>;
};

// ============================================================
// GLOBAL STYLES
// ============================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Outfit',system-ui,sans-serif;background:${B.black};color:${B.white};-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
input,textarea,select,button{font-family:'Outfit',system-ui,sans-serif}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${B.g700};border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideR{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideL{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,230,118,0.15)}50%{box-shadow:0 0 40px rgba(0,230,118,0.3)}}
@keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes checkPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1)}}
.au{animation:fadeUp .4s ease both}.au1{animation-delay:.05s}.au2{animation-delay:.1s}.au3{animation-delay:.15s}.au4{animation-delay:.2s}
input:focus,textarea:focus,select:focus{outline:none;border-color:${B.accent}!important;box-shadow:0 0 0 3px ${B.accentG}!important}
`;

// ============================================================
// UI COMPONENTS
// ============================================================
const Toast = ({ msg, type = "success", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'success' ? B.accent : type === 'error' ? B.danger : B.orange;
  const fg = type === 'success' ? B.black : B.white;
  return <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',background:bg,color:fg,padding:'12px 22px',borderRadius:14,fontWeight:600,fontSize:14,zIndex:9999,animation:'fadeUp .3s ease',maxWidth:'90%',display:'flex',alignItems:'center',gap:8,boxShadow:`0 6px 24px ${bg}40`}}><I n={type==='success'?'check':'bell'} s={16} c={fg}/>{msg}</div>;
};

const SuccessModal = ({ msg, sub, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:9999,animation:'fadeIn .2s ease'}}>
    <div style={{width:76,height:76,borderRadius:'50%',background:B.accentG,display:'flex',alignItems:'center',justifyContent:'center',border:`3px solid ${B.accent}`,animation:'checkPop .5s ease',marginBottom:20}}><I n="check" s={36} c={B.accent}/></div>
    <div style={{fontSize:21,fontWeight:700,marginBottom:6}}>{msg}</div>
    <div style={{fontSize:14,color:B.g300}}>{sub}</div>
  </div>;
};

const Btn = ({ children, onClick, v = "primary", full, dis, s = {} }) => {
  const base = {padding:'13px 24px',borderRadius:13,border:'none',cursor:dis?'not-allowed':'pointer',fontWeight:600,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:full?'100%':'auto',transition:'all .2s',opacity:dis?.5:1,fontFamily:"'Outfit',sans-serif"};
  const vars = {primary:{...base,background:B.accent,color:B.black},secondary:{...base,background:B.g700,color:B.white},outline:{...base,background:'transparent',color:B.accent,border:`1.5px solid ${B.accent}`},danger:{...base,background:B.danger,color:B.white},ghost:{...base,background:'transparent',color:B.g300,padding:'8px 14px'}};
  return <button onClick={dis?undefined:onClick} style={{...vars[v],...s}}>{children}</button>;
};

const Inp = ({ label, type = "text", value, onChange, placeholder, icon, multi, opts, req }) => {
  const [showP, setShowP] = useState(false);
  const isPw = type === 'password';
  if (opts) return <div style={{marginBottom:16}}>{label&&<label style={{fontSize:13,fontWeight:500,color:B.g300,marginBottom:5,display:'block'}}>{label}{req&&<span style={{color:B.accent}}> *</span>}</label>}<select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',padding:'13px 15px',borderRadius:11,border:`1.5px solid ${B.g700}`,background:B.card,color:B.white,fontSize:15,appearance:'none'}}><option value="">Selecciona...</option>{opts.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select></div>;
  return <div style={{marginBottom:16}}>{label&&<label style={{fontSize:13,fontWeight:500,color:B.g300,marginBottom:5,display:'block'}}>{label}{req&&<span style={{color:B.accent}}> *</span>}</label>}<div style={{position:'relative'}}>{icon&&<div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)'}}><I n={icon} s={17} c={B.g500}/></div>}{multi?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{width:'100%',padding:'13px 15px',paddingLeft:icon?42:15,borderRadius:11,border:`1.5px solid ${B.g700}`,background:B.card,color:B.white,fontSize:15,resize:'vertical',minHeight:90}}/>:<input type={isPw&&showP?'text':type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',padding:'13px 15px',paddingLeft:icon?42:15,paddingRight:isPw?42:15,borderRadius:11,border:`1.5px solid ${B.g700}`,background:B.card,color:B.white,fontSize:15}}/>}{isPw&&<div onClick={()=>setShowP(!showP)} style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',cursor:'pointer'}}><I n={showP?'eyeOff':'eye'} s={17} c={B.g500}/></div>}</div></div>;
};

const Stars = ({ value, onChange }) => <div style={{display:'flex',gap:6,margin:'6px 0 14px'}}>{[1,2,3,4,5].map(i=><div key={i} onClick={()=>onChange(i)} style={{cursor:'pointer',transition:'.2s',transform:i<=value?'scale(1.1)':'scale(1)'}}><I n="star" s={30} c={i<=value?B.accent:B.g700}/></div>)}</div>;

const Slider = ({ label, value, onChange, min = 1, max = 10, labels }) => <div style={{marginBottom:18}}>
  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,fontWeight:500,color:B.g300}}>{label}</span><span style={{fontSize:14,fontWeight:700,color:B.accent}}>{value}/{max}</span></div>
  <input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)} style={{width:'100%',height:5,borderRadius:3,appearance:'none',background:`linear-gradient(to right,${B.accent} ${((value-min)/(max-min))*100}%,${B.g700} ${((value-min)/(max-min))*100}%)`,cursor:'pointer'}}/>
  {labels&&<div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>{labels.map((l,i)=><span key={i} style={{fontSize:10,color:B.g500}}>{l}</span>)}</div>}
</div>;

const Header = ({ title, sub, onBack }) => <div style={{padding:'52px 20px 12px',background:B.dark,borderBottom:`1px solid ${B.g800}`,display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:50}}>
  {onBack&&<button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><I n="back" s={22}/></button>}
  <div><div style={{fontSize:17,fontWeight:700}}>{title}</div>{sub&&<div style={{fontSize:12,color:B.g500}}>{sub}</div>}</div>
</div>;

const TabBar = ({ tabs, active, onNav }) => <div style={{position:'fixed',bottom:0,left:0,right:0,background:B.dark,borderTop:`1px solid ${B.g800}`,padding:'7px 16px 22px',display:'flex',justifyContent:'space-around',zIndex:100,backdropFilter:'blur(20px)'}}>
  {tabs.map(t=><div key={t.key} onClick={()=>onNav(t.key)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',padding:'5px 10px'}}>
    <I n={t.icon} s={21} c={active===t.key?B.accent:B.g500}/><span style={{fontSize:10,fontWeight:active===t.key?600:400,color:active===t.key?B.accent:B.g500}}>{t.label}</span>
  </div>)}
</div>;

// ============================================================
// ONBOARDING
// ============================================================
const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const slides = [
    { icon:'zap', title:'APD Sport', sub:'Entrenamiento + Nutrición 1:1', desc:'Ciencia aplicada, acompañamiento real. Tu proceso deportivo, ordenado y monitorizado.', c:B.accent },
    { icon:'chat', title:'Comunicación Directa', sub:'Mensajería en tiempo real', desc:'Chat directo con tu entrenador-nutricionista. Dudas, sensaciones y ajustes al momento.', c:B.accent },
    { icon:'activity', title:'Feedback Semanal', sub:'Tu progreso, cuantificado', desc:'Cada semana reportas fatiga, nutrición y sensaciones. Pablo ajusta tu plan en consecuencia.', c:B.orange },
    { icon:'edit', title:'Solicita Cambios', sub:'Entrenos adaptados', desc:'¿Cambio de horario? ¿Molestia? Solicita modificaciones de entrenamiento de forma estructurada.', c:B.accent },
  ];
  const sl = slides[step];
  return <div style={{height:'100%',display:'flex',flexDirection:'column',background:`radial-gradient(ellipse at top,${B.dark} 0%,${B.black} 60%)`,padding:'0 24px',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',top:-80,right:-80,width:260,height:260,borderRadius:'50%',background:`radial-gradient(circle,${sl.c}08 0%,transparent 70%)`,transition:'all .5s'}}/>
    <div style={{display:'flex',justifyContent:'flex-end',paddingTop:52}}>{step<3&&<button onClick={onDone} style={{background:'none',border:'none',color:B.g500,fontSize:14,cursor:'pointer'}}>Saltar</button>}</div>
    <div key={step} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',animation:'fadeUp .4s ease'}}>
      <div style={{width:110,height:110,borderRadius:30,marginBottom:36,background:`linear-gradient(135deg,${sl.c}12,${sl.c}04)`,border:`2px solid ${sl.c}25`,display:'flex',alignItems:'center',justifyContent:'center',animation:'glow 2.5s ease-in-out infinite'}}><I n={sl.icon} s={48} c={sl.c}/></div>
      <div style={{fontSize:12,fontWeight:600,color:sl.c,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>{sl.sub}</div>
      <h1 style={{fontSize:30,fontWeight:800,marginBottom:14,lineHeight:1.2}}>{sl.title}</h1>
      <p style={{fontSize:15,color:B.g300,lineHeight:1.6,maxWidth:300}}>{sl.desc}</p>
    </div>
    <div style={{paddingBottom:44}}>
      <div style={{display:'flex',justifyContent:'center',gap:7,marginBottom:28}}>{slides.map((_,i)=><div key={i} style={{width:i===step?26:7,height:7,borderRadius:4,background:i===step?sl.c:B.g700,transition:'all .3s'}}/>)}</div>
      <Btn full onClick={()=>step<3?setStep(step+1):onDone()} s={{background:sl.c,fontSize:16,padding:'15px 24px',borderRadius:15}}>{step<3?'Siguiente':'Comenzar'}{step<3&&<I n="right" s={16} c={B.black}/>}</Btn>
    </div>
  </div>;
};

// ============================================================
// AUTH SCREENS
// ============================================================
const Login = ({ onLogin, onReg, onForgot }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const go = () => {
    setErr('');
    if (!email || !pass) { setErr('Completa todos los campos'); return; }
    setLoading(true);
    setTimeout(() => {
      const res = DB.login(email, pass);
      if (res.error) setErr(res.error);
      else onLogin(res.user);
      setLoading(false);
    }, 600);
  };

  return <div style={{height:'100%',display:'flex',flexDirection:'column',background:`radial-gradient(ellipse at bottom,${B.dark} 0%,${B.black} 60%)`,padding:'0 26px'}}>
    <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{textAlign:'center',marginBottom:44,animation:'fadeUp .5s ease'}}>
        <div style={{width:68,height:68,borderRadius:18,margin:'0 auto 18px',background:`linear-gradient(135deg,${B.accent},${B.accentD})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 36px ${B.accentG}`}}><I n="zap" s={34} c={B.black}/></div>
        <h1 style={{fontSize:27,fontWeight:800}}>APD Sport</h1>
        <p style={{fontSize:13,color:B.g500,marginTop:5}}>Entrenamiento · Nutrición · Rendimiento</p>
      </div>
      <div className="au au2">
        <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" icon="mail"/>
        <Inp label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••" icon="lock"/>
        {err&&<div style={{background:B.dangerG,border:`1px solid ${B.danger}35`,borderRadius:11,padding:'10px 14px',marginBottom:14,fontSize:13,color:B.danger}}>{err}</div>}
        <Btn full onClick={go} dis={loading} s={{marginTop:6,padding:'15px',fontSize:16}}>{loading?'Accediendo...':'Iniciar sesión'}</Btn>
        <button onClick={onForgot} style={{background:'none',border:'none',color:B.accent,fontSize:13,fontWeight:500,cursor:'pointer',display:'block',margin:'14px auto 0'}}>¿Olvidaste tu contraseña?</button>
      </div>
    </div>
    <div style={{textAlign:'center',paddingBottom:36}}><span style={{fontSize:14,color:B.g500}}>¿No tienes cuenta? </span><button onClick={onReg} style={{background:'none',border:'none',color:B.accent,fontSize:14,fontWeight:600,cursor:'pointer'}}>Regístrate</button></div>
  </div>;
};

const Register = ({ onBack, onDone }) => {
  const [f, setF] = useState({name:'',email:'',phone:'',sport:'',pass:'',pass2:''});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const u = (k,v) => setF({...f,[k]:v});

  const go = () => {
    if (!f.name||!f.email||!f.pass) { setErr('Completa los campos obligatorios'); return; }
    if (f.pass.length < 6) { setErr('Mínimo 6 caracteres en contraseña'); return; }
    if (f.pass !== f.pass2) { setErr('Las contraseñas no coinciden'); return; }
    const res = DB.register(f.name, f.email, f.pass, f.phone, f.sport);
    if (res.error) { setErr(res.error); return; }
    setOk(true);
    setTimeout(onDone, 2200);
  };

  return <div style={{height:'100%',overflowY:'auto',background:B.black,padding:'0 26px'}}>
    {ok&&<SuccessModal msg="¡Cuenta creada!" sub="Ya puedes iniciar sesión" onClose={()=>{}}/>}
    <div style={{paddingTop:52,paddingBottom:16}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:7,color:B.g300,fontSize:14,marginBottom:20}}><I n="back" s={18} c={B.g300}/> Volver</button>
      <h1 style={{fontSize:25,fontWeight:800,marginBottom:6}}>Crear cuenta</h1>
      <p style={{fontSize:14,color:B.g500}}>Únete a APD Sport</p>
    </div>
    <div className="au" style={{paddingBottom:40}}>
      <Inp label="Nombre completo" value={f.name} onChange={v=>u('name',v)} placeholder="Tu nombre" icon="user" req/>
      <Inp label="Email" type="email" value={f.email} onChange={v=>u('email',v)} placeholder="tu@email.com" icon="mail" req/>
      <Inp label="Teléfono" value={f.phone} onChange={v=>u('phone',v)} placeholder="+34 600 000 000"/>
      <Inp label="Deporte principal" value={f.sport} onChange={v=>u('sport',v)} opts={["Ciclismo","Running","Triatlón","Duatlón","Ultrafondo","Otro"]}/>
      <Inp label="Contraseña" type="password" value={f.pass} onChange={v=>u('pass',v)} placeholder="Mín. 6 caracteres" icon="lock" req/>
      <Inp label="Confirmar contraseña" type="password" value={f.pass2} onChange={v=>u('pass2',v)} placeholder="Repite contraseña" icon="lock" req/>
      {err&&<div style={{background:B.dangerG,border:`1px solid ${B.danger}35`,borderRadius:11,padding:'10px 14px',marginBottom:14,fontSize:13,color:B.danger}}>{err}</div>}
      <Btn full onClick={go} s={{marginTop:6,padding:'15px',fontSize:16}}>Crear cuenta</Btn>
    </div>
  </div>;
};

const ForgotPw = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return <div style={{height:'100%',background:B.black,padding:'0 26px'}}>
    <div style={{paddingTop:52}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:7,color:B.g300,fontSize:14,marginBottom:20}}><I n="back" s={18} c={B.g300}/> Volver</button>
      <h1 style={{fontSize:25,fontWeight:800,marginBottom:6}}>Recuperar contraseña</h1>
      <p style={{fontSize:14,color:B.g500,marginBottom:28}}>Te enviaremos un enlace de recuperación</p>
    </div>
    {sent?<div className="au" style={{textAlign:'center',paddingTop:32}}>
      <div style={{width:76,height:76,borderRadius:'50%',background:B.accentG,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',border:`2px solid ${B.accent}35`}}><I n="mail" s={34} c={B.accent}/></div>
      <h2 style={{fontSize:19,fontWeight:700,marginBottom:6}}>Email enviado</h2>
      <p style={{fontSize:14,color:B.g300,lineHeight:1.6}}>Revisa tu bandeja de entrada.</p>
      <Btn onClick={onBack} full s={{marginTop:28}}>Volver al inicio</Btn>
    </div>:<div className="au">
      <Inp label="Email registrado" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" icon="mail"/>
      <Btn full onClick={()=>setSent(true)} dis={!email} s={{marginTop:6,padding:'15px'}}>Enviar enlace</Btn>
    </div>}
  </div>;
};

// ============================================================
// CLIENT SCREENS
// ============================================================
const ClientHome = ({ user, onNav }) => {
  const unread = DB.getUnreadCount('client', user.id);
  return <div style={{height:'100%',overflowY:'auto',padding:'0 20px 90px'}}>
    <div style={{paddingTop:52,marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><p style={{fontSize:13,color:B.g500}}>Hola,</p><h1 style={{fontSize:25,fontWeight:800}}>{user.name.split(' ')[0]} 👋</h1></div>
        <div style={{position:'relative',cursor:'pointer'}}><div style={{width:42,height:42,borderRadius:13,background:B.card,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${B.g700}`}}><I n="bell" s={19}/></div>
        {unread>0&&<div style={{position:'absolute',top:-3,right:-3,width:17,height:17,borderRadius:'50%',background:B.danger,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,animation:'bounce 1s ease infinite'}}>{unread}</div>}</div>
      </div>
    </div>

    {/* Week stats */}
    <div style={{background:`linear-gradient(135deg,${B.accent}10,${B.accent}03)`,border:`1px solid ${B.accent}18`,borderRadius:18,padding:18,marginBottom:22,animation:'fadeUp .4s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><span style={{fontSize:12,color:B.g300,fontWeight:500}}>Tu semana</span><span style={{fontSize:11,color:B.accent,fontWeight:600}}>Semana {Math.ceil((Date.now()-new Date(user.createdAt).getTime())/(7*24*60*60*1000))||1}</span></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        {[{l:'Feedbacks',v:DB.getFeedbacks(user.id).length,c:B.accent},{l:'Solicitudes',v:DB.getTrainingMods(user.id).length,c:B.accent},{l:'Mensajes',v:DB.getMessages([user.id,'admin_1'].sort().join('_')).length,c:B.orange}].map((s,i)=>
          <div key={i} style={{textAlign:'center'}}><div style={{fontSize:19,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:B.g500,marginTop:3}}>{s.l}</div></div>
        )}
      </div>
    </div>

    {/* Actions */}
    <h2 style={{fontSize:17,fontWeight:700,marginBottom:14}}>Acciones</h2>
    {[
      {key:'chat',icon:'chat',title:'Mensajería',desc:'Chat directo con Pablo',c:B.accent,badge:unread},
      {key:'training',icon:'edit',title:'Modificar Entrenamiento',desc:'Solicita cambios en tu plan',c:B.orange},
      {key:'feedback',icon:'doc',title:'Feedback Semanal',desc:'Reporta tu semana',c:B.accent},
    ].map((item,i)=>
      <div key={item.key} onClick={()=>onNav(item.key)} className={`au au${i+1}`} style={{background:B.card,borderRadius:16,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',border:`1px solid ${B.g700}`,marginBottom:10,position:'relative'}}>
        <div style={{width:44,height:44,borderRadius:13,background:`${item.c}12`,border:`1.5px solid ${item.c}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><I n={item.icon} s={20} c={item.c}/></div>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{item.title}</div><div style={{fontSize:12,color:B.g500,marginTop:2}}>{item.desc}</div></div>
        {item.badge>0&&<div style={{width:22,height:22,borderRadius:'50%',background:B.danger,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>{item.badge}</div>}
        <I n="right" s={16} c={B.g500}/>
      </div>
    )}

    {/* Export */}
    <div onClick={()=>onNav('export')} style={{background:B.card,borderRadius:16,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',border:`1px solid ${B.g700}`,marginTop:6}}>
      <div style={{width:44,height:44,borderRadius:13,background:`${B.accent}08`,display:'flex',alignItems:'center',justifyContent:'center'}}><I n="download" s={20} c={B.accent}/></div>
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>Exportar Historial</div><div style={{fontSize:12,color:B.g500}}>Descarga tu progreso en PDF</div></div>
      <I n="right" s={16} c={B.g500}/>
    </div>
  </div>;
};

// Chat
const Chat = ({ user, onBack, otherUser, isAdmin }) => {
  const chatId = isAdmin ? [user.id, otherUser.id].sort().join('_') : [user.id, 'admin_1'].sort().join('_');
  const [msgs, setMsgs] = useState(DB.getMessages(chatId));
  const [inp, setInp] = useState('');
  const endRef = useRef(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({behavior:'smooth'}); 
  }, [msgs]);

  // Poll for new messages
  useEffect(() => {
    const iv = setInterval(() => setMsgs(DB.getMessages(chatId)), 2000);
    return () => clearInterval(iv);
  }, [chatId]);

  const send = () => {
    if (!inp.trim()) return;
    DB.sendMessage(chatId, user.id, inp);
    setMsgs(DB.getMessages(chatId));
    setInp('');
  };

  const otherName = isAdmin ? otherUser?.name : 'Pablo — APD Sport';
  const otherInit = isAdmin ? (otherUser?.name?.[0]||'C') : 'P';

  return <div style={{height:'100%',display:'flex',flexDirection:'column',background:B.black}}>
    <div style={{padding:'52px 20px 12px',background:B.dark,borderBottom:`1px solid ${B.g800}`,display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><I n="back" s={21}/></button>
      <div style={{width:38,height:38,borderRadius:11,background:`${B.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:B.accent}}>{otherInit}</div>
      <div><div style={{fontSize:15,fontWeight:600}}>{otherName}</div><div style={{fontSize:11,color:B.accent}}>● En línea</div></div>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'16px 14px'}}>
      {msgs.length===0&&<div style={{textAlign:'center',paddingTop:60,color:B.g500,fontSize:14}}>Sin mensajes aún. ¡Envía el primero!</div>}
      {msgs.map((m,i)=>{
        const mine = m.from === user.id;
        return <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start',marginBottom:10,animation:`${mine?'slideR':'slideL'} .25s ease both`,animationDelay:`${Math.min(i*.03,.3)}s`}}>
          <div style={{maxWidth:'78%',padding:'11px 15px',borderRadius:16,borderBottomRightRadius:mine?3:16,borderBottomLeftRadius:mine?16:3,background:mine?B.accent:B.card,color:mine?B.black:B.white}}>
            <div style={{fontSize:14,lineHeight:1.5}}>{m.text}</div>
            <div style={{fontSize:10,marginTop:5,opacity:.55,textAlign:'right'}}>{m.time}</div>
          </div>
        </div>;
      })}
      <div ref={endRef}/>
    </div>
    <div style={{padding:'10px 14px 24px',background:B.dark,borderTop:`1px solid ${B.g800}`,display:'flex',alignItems:'center',gap:9}}>
      <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Escribe un mensaje..." style={{flex:1,padding:'13px 16px',borderRadius:14,border:`1.5px solid ${B.g700}`,background:B.card,color:B.white,fontSize:14}}/>
      <button onClick={send} style={{width:46,height:46,borderRadius:13,border:'none',cursor:'pointer',background:inp.trim()?B.accent:B.g700,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}><I n="send" s={19} c={inp.trim()?B.black:B.g500}/></button>
    </div>
  </div>;
};

// Training Mod
const TrainingMod = ({ user, onBack }) => {
  const [f, setF] = useState({type:'',date:'',reason:'',bodyPart:'',pain:3,alt:'',notes:''});
  const [ok, setOk] = useState(false);
  const u = (k,v) => setF({...f,[k]:v});

  const submit = () => {
    if (!f.type||!f.reason) return;
    DB.submitTrainingMod(user.id, f);
    setOk(true);
  };

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    {ok&&<SuccessModal msg="¡Solicitud enviada!" sub="Pablo revisará tu petición pronto" onClose={onBack}/>}
    <Header title="Modificar Entrenamiento" sub="Solicita cambios en tu plan" onBack={onBack}/>
    <div style={{padding:'20px 20px 36px'}}>
      <div className="au" style={{background:`${B.orange}08`,border:`1px solid ${B.orange}20`,borderRadius:14,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        <I n="edit" s={18} c={B.orange}/><span style={{fontSize:12,color:B.orange,lineHeight:1.5}}>Completa el formulario. Pablo ajustará tu plan lo antes posible.</span>
      </div>
      <Inp label="Tipo de modificación" value={f.type} onChange={v=>u('type',v)} req opts={["Cambio de horario","Reducir intensidad","Cambiar ejercicio por molestia","Añadir sesión extra","Eliminar sesión esta semana","Adaptar por viaje/evento","Otro"]}/>
      <Inp label="Fecha de la sesión" type="date" value={f.date} onChange={v=>u('date',v)}/>
      <Inp label="Motivo principal" value={f.reason} onChange={v=>u('reason',v)} req opts={["Molestia/dolor muscular","Fatiga acumulada","Problema de horario","Enfermedad/malestar","Viaje o compromiso","Falta de material","Otro"]}/>
      {f.reason==='Molestia/dolor muscular'&&<><Inp label="Zona afectada" value={f.bodyPart} onChange={v=>u('bodyPart',v)} opts={["Rodilla","Espalda baja","Hombro","Isquiotibiales","Cuádriceps","Gemelos","Cadera","Tobillo","Otra"]}/><Slider label="Nivel de dolor" value={f.pain} onChange={v=>u('pain',v)} labels={["Leve","Moderado","Severo"]}/></>}
      <Inp label="Alternativa en mente" value={f.alt} onChange={v=>u('alt',v)} multi placeholder="Ej: Podría hacer bici en lugar de correr..."/>
      <Inp label="Notas adicionales" value={f.notes} onChange={v=>u('notes',v)} multi placeholder="Cualquier detalle relevante..."/>
      <Btn full onClick={submit} dis={!f.type||!f.reason} s={{marginTop:10,background:B.orange,padding:'15px'}}><I n="send" s={17} c={B.black}/> Enviar solicitud</Btn>
    </div>
  </div>;
};

// Feedback
const Feedback = ({ user, onBack }) => {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({fatigue:5,sleep:7,mood:7,soreness:3,nutrition:7,hydration:7,weight:'',digestive:'Bien',sessions:'',best:'',worst:'',rating:4,text:''});
  const [ok, setOk] = useState(false);
  const u = (k,v) => setF({...f,[k]:v});

  const steps = [
    {title:'Estado Físico',icon:'activity',content:<>
      <Slider label="Fatiga general" value={f.fatigue} onChange={v=>u('fatigue',v)} labels={["Fresco","Normal","Fatigado"]}/>
      <Slider label="Calidad de sueño" value={f.sleep} onChange={v=>u('sleep',v)} labels={["Mal","Regular","Excelente"]}/>
      <Slider label="Estado de ánimo" value={f.mood} onChange={v=>u('mood',v)} labels={["Bajo","Normal","Muy bien"]}/>
      <Slider label="Molestias musculares" value={f.soreness} onChange={v=>u('soreness',v)} labels={["Ninguna","Algo","Mucho"]}/>
    </>},
    {title:'Nutrición',icon:'doc',content:<>
      <Slider label="Adherencia nutricional" value={f.nutrition} onChange={v=>u('nutrition',v)} labels={["Poca","Media","Total"]}/>
      <Slider label="Hidratación" value={f.hydration} onChange={v=>u('hydration',v)} labels={["Poca","Aceptable","Muy buena"]}/>
      <Inp label="Peso esta semana (kg)" type="number" value={f.weight} onChange={v=>u('weight',v)} placeholder="Ej: 72.5"/>
      <Inp label="Estado digestivo" value={f.digestive} onChange={v=>u('digestive',v)} opts={["Muy bien","Bien","Regular","Mal","Con molestias"]}/>
    </>},
    {title:'Entrenamiento',icon:'edit',content:<>
      <Inp label="Sesiones completadas" value={f.sessions} onChange={v=>u('sessions',v)} opts={["Todas","Todas menos 1","Menos de la mitad","Ninguna"]}/>
      <Inp label="Mejor sesión" value={f.best} onChange={v=>u('best',v)} multi placeholder="¿Qué sesión fue la mejor?"/>
      <Inp label="Peor sesión o dificultad" value={f.worst} onChange={v=>u('worst',v)} multi placeholder="¿Algo que no salió bien?"/>
    </>},
    {title:'Valoración Global',icon:'star',content:<>
      <div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:500,color:B.g300}}>Valoración de la semana</label><Stars value={f.rating} onChange={v=>u('rating',v)}/></div>
      <Inp label="Comentarios libres" value={f.text} onChange={v=>u('text',v)} multi placeholder="Sensaciones, dudas, lo que necesites compartir..."/>
    </>},
  ];

  const submit = () => { DB.submitFeedback(user.id, f); setOk(true); };

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    {ok&&<SuccessModal msg="¡Feedback enviado!" sub="Pablo lo revisará hoy" onClose={onBack}/>}
    <div style={{padding:'52px 20px 12px',background:B.dark,borderBottom:`1px solid ${B.g800}`,position:'sticky',top:0,zIndex:50}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><I n="back" s={21}/></button>
        <div><div style={{fontSize:17,fontWeight:700}}>Feedback Semanal</div><div style={{fontSize:11,color:B.g500}}>Paso {step+1} de {steps.length} — {steps[step].title}</div></div>
      </div>
      <div style={{display:'flex',gap:3}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?B.accent:B.g700,transition:'all .3s'}}/>)}</div>
    </div>
    <div style={{padding:'20px 20px 36px'}} key={step} className="au">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <div style={{width:42,height:42,borderRadius:13,background:B.accentG,display:'flex',alignItems:'center',justifyContent:'center'}}><I n={steps[step].icon} s={20} c={B.accent}/></div>
        <h2 style={{fontSize:19,fontWeight:700}}>{steps[step].title}</h2>
      </div>
      {steps[step].content}
      <div style={{display:'flex',gap:10,marginTop:20}}>
        {step>0&&<Btn v="secondary" onClick={()=>setStep(step-1)} s={{flex:1}}>Anterior</Btn>}
        {step<3?<Btn onClick={()=>setStep(step+1)} s={{flex:1}}>Siguiente</Btn>:<Btn onClick={submit} s={{flex:1}}><I n="send" s={16} c={B.black}/> Enviar</Btn>}
      </div>
    </div>
  </div>;
};

// Export
const Export = ({ user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const feedbacks = DB.getFeedbacks(user.id);
  const mods = DB.getTrainingMods(user.id);

  const doExport = () => {
    setLoading(true);
    setTimeout(() => {
      // Generate text-based export
      let content = `APD SPORT — HISTORIAL DE PROGRESO\n${'='.repeat(40)}\nCliente: ${user.name}\nEmail: ${user.email}\nDeporte: ${user.sport||'N/A'}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
      content += `FEEDBACKS SEMANALES (${feedbacks.length})\n${'-'.repeat(30)}\n`;
      feedbacks.forEach((fb,i) => {
        content += `\n#${i+1} — ${fb.date}\nFatiga: ${fb.fatigue}/10 | Sueño: ${fb.sleep}/10 | Ánimo: ${fb.mood}/10\nNutrición: ${fb.nutrition}/10 | Hidratación: ${fb.hydration}/10\nPeso: ${fb.weight||'N/A'} kg | Digestivo: ${fb.digestive}\nSesiones: ${fb.sessions||'N/A'}\nValoración: ${fb.rating}/5 estrellas\n${fb.text?`Comentarios: ${fb.text}\n`:''}\n`;
      });
      content += `\nSOLICITUDES DE MODIFICACIÓN (${mods.length})\n${'-'.repeat(30)}\n`;
      mods.forEach((m,i) => {
        content += `\n#${i+1} — ${m.date}\nTipo: ${m.type} | Motivo: ${m.reason}\n${m.bodyPart?`Zona: ${m.bodyPart} | Dolor: ${m.pain}/10\n`:''}${m.alt?`Alternativa: ${m.alt}\n`:''}${m.notes?`Notas: ${m.notes}\n`:''}\n`;
      });
      // Download
      const blob = new Blob([content], {type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `apdsport_progreso_${user.name.replace(/\s/g,'_')}.txt`;
      a.click(); URL.revokeObjectURL(url);
      setLoading(false); setDone(true);
    }, 1500);
  };

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    <Header title="Exportar Historial" onBack={onBack}/>
    <div style={{padding:'20px 20px 36px'}}>
      <div className="au" style={{textAlign:'center',paddingTop:16}}>
        <div style={{width:90,height:90,borderRadius:26,margin:'0 auto 20px',background:B.accentG,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${B.accent}25`}}><I n="download" s={40} c={B.accent}/></div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:6}}>Exportar Progreso</h2>
        <p style={{fontSize:13,color:B.g300,lineHeight:1.6,marginBottom:28}}>Descarga tu historial de feedback y solicitudes de modificación.</p>
      </div>
      {[`${feedbacks.length} feedback(s) semanal(es)`,`${mods.length} solicitud(es) de modificación`,'Métricas de progreso'].map((it,i)=>
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:B.card,borderRadius:13,border:`1px solid ${B.g700}`,marginBottom:8}}>
          <I n="check" s={16} c={B.accent}/><span style={{fontSize:13,color:B.g100}}>{it}</span>
        </div>
      )}
      <div style={{marginTop:20}}>
        {done?<div className="au" style={{textAlign:'center'}}>
          <div style={{background:B.accentG,borderRadius:14,padding:18,marginBottom:14}}><I n="check" s={28} c={B.accent}/><p style={{fontSize:15,fontWeight:600,marginTop:10}}>Archivo descargado</p></div>
          <Btn full v="outline" onClick={onBack}>Volver</Btn>
        </div>:<Btn full onClick={doExport} dis={loading}>
          {loading?<><div style={{width:16,height:16,border:`2px solid ${B.black}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/> Generando...</>:<><I n="download" s={17} c={B.black}/> Descargar historial</>}
        </Btn>}
      </div>
    </div>
  </div>;
};

// Client Profile
const ClientProfile = ({ user, onLogout }) => <div style={{height:'100%',overflowY:'auto',padding:'52px 20px 90px',background:B.black}}>
  <h1 style={{fontSize:23,fontWeight:800,marginBottom:24}}>Mi Perfil</h1>
  <div style={{display:'flex',alignItems:'center',gap:14,padding:18,background:B.card,borderRadius:18,marginBottom:22,border:`1px solid ${B.g700}`}}>
    <div style={{width:56,height:56,borderRadius:16,background:`${B.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:B.accent}}>{user.name[0]}</div>
    <div><div style={{fontSize:17,fontWeight:700}}>{user.name}</div><div style={{fontSize:12,color:B.g500}}>{user.sport||'Deportista'} · {user.email}</div></div>
  </div>
  {[{i:'user',l:'Datos personales'},{i:'activity',l:'Mis métricas'},{i:'calendar',l:'Historial'},{i:'settings',l:'Ajustes'}].map((item,i)=>
    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:`1px solid ${B.g800}`,cursor:'pointer'}}>
      <I n={item.i} s={19} c={B.g300}/><span style={{flex:1,fontSize:14,color:B.g100}}>{item.l}</span><I n="right" s={15} c={B.g500}/>
    </div>
  )}
  <Btn full v="danger" onClick={onLogout} s={{marginTop:28}}><I n="logout" s={17} c={B.white}/> Cerrar sesión</Btn>
</div>;

// ============================================================
// ADMIN SCREENS
// ============================================================
const AdminHome = ({ user, onNav }) => {
  const clients = DB.getClients();
  const unread = DB.getUnreadCount('admin', user.id);
  const notifs = DB.getNotifications('admin', user.id).slice(0, 6);

  return <div style={{height:'100%',overflowY:'auto',padding:'0 20px 90px'}}>
    <div style={{paddingTop:52,marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><p style={{fontSize:13,color:B.g500}}>Panel Admin</p><h1 style={{fontSize:25,fontWeight:800}}>Hola, Pablo ⚡</h1></div>
        <div style={{position:'relative'}}><div style={{width:42,height:42,borderRadius:13,background:B.card,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${B.g700}`}}><I n="bell" s={19}/></div>
        {unread>0&&<div style={{position:'absolute',top:-3,right:-3,width:17,height:17,borderRadius:'50%',background:B.danger,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,animation:'bounce 1s ease infinite'}}>{unread}</div>}</div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:22}}>
      {[{l:'Clientes',v:clients.length,i:'users',c:B.accent},{l:'Sin leer',v:unread,i:'chat',c:B.orange},{l:'Feedbacks hoy',v:notifs.filter(n=>n.type==='feedback').length,i:'doc',c:B.accent},{l:'Modificaciones',v:notifs.filter(n=>n.type==='training_mod').length,i:'edit',c:B.orange}].map((s,i)=>
        <div key={i} className={`au au${i+1}`} style={{background:B.card,borderRadius:16,padding:16,border:`1px solid ${B.g700}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><I n={s.i} s={18} c={s.c}/><span style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</span></div>
          <span style={{fontSize:11,color:B.g500}}>{s.l}</span>
        </div>
      )}
    </div>
    <h2 style={{fontSize:17,fontWeight:700,marginBottom:14}}>Acciones rápidas</h2>
    <div style={{display:'flex',gap:10,marginBottom:24}}>
      <div onClick={()=>onNav('broadcast')} style={{flex:1,background:`${B.accent}08`,border:`1.5px solid ${B.accent}20`,borderRadius:14,padding:16,cursor:'pointer',textAlign:'center'}}>
        <I n="broadcast" s={22} c={B.accent}/><div style={{fontSize:12,fontWeight:600,marginTop:6}}>Difusión</div>
      </div>
      <div onClick={()=>onNav('clients')} style={{flex:1,background:`${B.orange}08`,border:`1.5px solid ${B.orange}20`,borderRadius:14,padding:16,cursor:'pointer',textAlign:'center'}}>
        <I n="users" s={22} c={B.orange}/><div style={{fontSize:12,fontWeight:600,marginTop:6}}>Clientes</div>
      </div>
    </div>
    <h2 style={{fontSize:17,fontWeight:700,marginBottom:14}}>Alertas recientes</h2>
    {notifs.length===0&&<p style={{fontSize:13,color:B.g500}}>No hay alertas todavía</p>}
    {notifs.map((n,i)=>
      <div key={n.id} className={`au au${Math.min(i+1,4)}`} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${B.g800}`,cursor:'pointer'}}>
        <div style={{width:40,height:40,borderRadius:11,background:`${n.type==='feedback'?B.accent:B.orange}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><I n={n.type==='feedback'?'doc':n.type==='training_mod'?'edit':'chat'} s={16} c={n.type==='feedback'?B.accent:B.orange}/></div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{n.fromName}</div><div style={{fontSize:12,color:B.g500}}>{n.type==='feedback'?'Nuevo feedback':n.type==='training_mod'?'Solicitud de modificación':'Nuevo mensaje'}</div></div>
        <span style={{fontSize:10,color:B.g500}}>{new Date(n.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>
    )}
  </div>;
};

const AdminClients = ({ user, onBack, onSelect }) => {
  const [q, setQ] = useState('');
  const clients = DB.getClients().filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    <div style={{padding:'52px 20px 12px',background:B.dark,borderBottom:`1px solid ${B.g800}`,position:'sticky',top:0,zIndex:50}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><I n="back" s={21}/></button>
        <h1 style={{fontSize:19,fontWeight:700}}>Mis Clientes</h1>
        <span style={{marginLeft:'auto',background:B.accent,color:B.black,padding:'3px 10px',borderRadius:18,fontSize:12,fontWeight:700}}>{DB.getClients().length}</span>
      </div>
      <div style={{position:'relative'}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." style={{width:'100%',padding:'11px 14px 11px 38px',borderRadius:11,border:`1.5px solid ${B.g700}`,background:B.card,color:B.white,fontSize:13}}/><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><I n="search" s={15} c={B.g500}/></div></div>
    </div>
    <div style={{padding:'12px 20px'}}>
      {clients.length===0&&<p style={{textAlign:'center',color:B.g500,paddingTop:40,fontSize:14}}>No hay clientes registrados</p>}
      {clients.map((c,i)=>{
        const chatId = ['admin_1',c.id].sort().join('_');
        const msgs = DB.getMessages(chatId);
        const lastMsg = msgs[msgs.length-1];
        return <div key={c.id} onClick={()=>onSelect(c)} className={`au au${Math.min(i+1,4)}`} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:`1px solid ${B.g800}`,cursor:'pointer'}}>
          <div style={{width:44,height:44,borderRadius:13,background:`${B.accent}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:B.accent,flexShrink:0}}>{c.name[0]}{c.name.split(' ')[1]?.[0]||''}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:B.g500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.sport||'Sin deporte'} · {lastMsg?lastMsg.text.substring(0,30)+'...':'Sin mensajes'}</div></div>
          <div style={{textAlign:'right',flexShrink:0}}><div style={{fontSize:10,color:B.g500}}>{c.createdAt?new Date(c.createdAt).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):''}</div></div>
        </div>;
      })}
    </div>
  </div>;
};

const AdminClientDetail = ({ client, onBack, onChat }) => {
  const fbs = DB.getFeedbacks(client.id);
  const mods = DB.getTrainingMods(client.id);
  const lastFb = fbs[fbs.length-1];

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    <Header title={client.name} onBack={onBack}/>
    <div style={{padding:'20px 20px 36px'}}>
      <div style={{background:B.card,borderRadius:18,padding:22,marginBottom:22,border:`1px solid ${B.g700}`,textAlign:'center'}}>
        <div style={{width:66,height:66,borderRadius:18,margin:'0 auto 14px',background:`${B.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:B.accent}}>{client.name[0]}</div>
        <h2 style={{fontSize:19,fontWeight:700,marginBottom:3}}>{client.name}</h2>
        <p style={{fontSize:12,color:B.g500,marginBottom:14}}>{client.sport||'Deportista'} · {client.email}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[{l:'Feedbacks',v:fbs.length},{l:'Solicitudes',v:mods.length},{l:'Desde',v:new Date(client.createdAt).toLocaleDateString('es-ES',{month:'short',year:'2-digit'})}].map((s,i)=>
            <div key={i}><div style={{fontSize:14,fontWeight:700,color:B.accent}}>{s.v}</div><div style={{fontSize:10,color:B.g500,marginTop:2}}>{s.l}</div></div>
          )}
        </div>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:22}}>
        <Btn onClick={onChat} s={{flex:1}}><I n="chat" s={17} c={B.black}/> Chat</Btn>
        <Btn v="secondary" s={{flex:1}} onClick={()=>{}}><I n="doc" s={17}/> Feedbacks</Btn>
      </div>
      {lastFb&&<><h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Último feedback</h3>
        <div style={{background:B.card,borderRadius:14,padding:16,border:`1px solid ${B.g700}`}}>
          {[{l:'Fatiga',v:lastFb.fatigue},{l:'Sueño',v:lastFb.sleep},{l:'Nutrición',v:lastFb.nutrition},{l:'Ánimo',v:lastFb.mood}].map((m,i)=>
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<3?10:0}}>
              <span style={{fontSize:12,color:B.g300,width:64}}>{m.l}</span>
              <div style={{flex:1,height:5,borderRadius:3,background:B.g700}}><div style={{height:'100%',borderRadius:3,width:`${(m.v/10)*100}%`,background:m.v>=7?B.accent:m.v>=4?B.warn:B.danger}}/></div>
              <span style={{fontSize:12,fontWeight:700,color:B.accent,width:26,textAlign:'right'}}>{m.v}</span>
            </div>
          )}
        </div>
      </>}
      {!lastFb&&<p style={{fontSize:13,color:B.g500,textAlign:'center',paddingTop:12}}>Este cliente aún no ha enviado feedback</p>}
    </div>
  </div>;
};

const Broadcast = ({ user, onBack }) => {
  const [msg, setMsg] = useState('');
  const clients = DB.getClients();
  const [sel, setSel] = useState(clients.map(c=>c.id));
  const [ok, setOk] = useState(false);

  const toggle = id => setSel(sel.includes(id)?sel.filter(i=>i!==id):[...sel,id]);

  return <div style={{height:'100%',overflowY:'auto',background:B.black}}>
    {ok&&<SuccessModal msg="¡Difusión enviada!" sub={`Enviado a ${sel.length} clientes`} onClose={onBack}/>}
    <Header title="Mensaje de difusión" sub="Envía a todos o selecciona" onBack={onBack}/>
    <div style={{padding:'20px 20px 36px'}}>
      <div style={{marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <label style={{fontSize:12,fontWeight:500,color:B.g300}}>Destinatarios</label>
          <button onClick={()=>setSel(sel.length===clients.length?[]:clients.map(c=>c.id))} style={{background:'none',border:'none',color:B.accent,fontSize:12,cursor:'pointer',fontWeight:600}}>{sel.length===clients.length?'Ninguno':'Todos'}</button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {clients.map(c=><div key={c.id} onClick={()=>toggle(c.id)} style={{padding:'7px 14px',borderRadius:18,cursor:'pointer',fontSize:12,fontWeight:500,background:sel.includes(c.id)?B.accent:B.card,color:sel.includes(c.id)?B.black:B.g300,border:`1.5px solid ${sel.includes(c.id)?B.accent:B.g700}`,transition:'all .2s'}}>{c.name.split(' ')[0]}</div>)}
          {clients.length===0&&<p style={{fontSize:13,color:B.g500}}>No hay clientes registrados aún</p>}
        </div>
      </div>
      <Inp label="Mensaje" value={msg} onChange={setMsg} multi placeholder="Escribe tu mensaje de difusión..."/>
      <Btn full onClick={()=>{DB.sendBroadcast(user.id,msg,sel);setOk(true);}} dis={!msg.trim()||sel.length===0} s={{marginTop:8}}><I n="broadcast" s={17} c={B.black}/> Enviar a {sel.length}</Btn>
    </div>
  </div>;
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [selClient, setSelClient] = useState(null);
  const [tab, setTab] = useState('home');

  useEffect(() => {
    DB.initAdmin();
    const saved = DB.get('session');
    if (saved) { setUser(saved); setScreen(saved.role === 'admin' ? 'a-home' : 'c-home'); }
  }, []);

  const login = (u) => { setUser(u); DB.set('session', u); setScreen(u.role==='admin'?'a-home':'c-home'); setTab('home'); setToast({msg:u.role==='admin'?'Bienvenido, Pablo':'Bienvenido a APD Sport',type:'success'}); };
  const logout = () => { setUser(null); DB.set('session', null); setScreen('login'); setTab('home'); setSelClient(null); };

  const cNav = (s) => { if (['home','chat','feedback','profile'].includes(s)) setTab(s); setScreen(`c-${s}`); };
  const aNav = (s) => { if (['home','clients','broadcast','profile'].includes(s)) setTab(s); setScreen(`a-${s}`); };
  const goHome = () => { setScreen(user?.role==='admin'?'a-home':'c-home'); setTab('home'); };

  const clientTabs = [{key:'home',icon:'home',label:'Inicio'},{key:'chat',icon:'chat',label:'Chat'},{key:'feedback',icon:'doc',label:'Feedback'},{key:'profile',icon:'user',label:'Perfil'}];
  const adminTabs = [{key:'home',icon:'home',label:'Inicio'},{key:'clients',icon:'users',label:'Clientes'},{key:'broadcast',icon:'broadcast',label:'Difusión'},{key:'profile',icon:'settings',label:'Ajustes'}];

  const showClientTabs = screen.startsWith('c-') && !['c-chat','c-training','c-feedback','c-export'].includes(screen);
  const showAdminTabs = screen.startsWith('a-') && !['a-chat','a-clients','a-client','a-broadcast'].includes(screen);

  const r = () => {
    switch(screen) {
      case 'onboarding': return <Onboarding onDone={()=>setScreen('login')}/>;
      case 'login': return <Login onLogin={login} onReg={()=>setScreen('register')} onForgot={()=>setScreen('forgot')}/>;
      case 'register': return <Register onBack={()=>setScreen('login')} onDone={()=>{setScreen('login');setToast({msg:'Cuenta creada. Inicia sesión.',type:'success'});}}/>;
      case 'forgot': return <ForgotPw onBack={()=>setScreen('login')}/>;
      // Client
      case 'c-home': return <ClientHome user={user} onNav={cNav}/>;
      case 'c-chat': return <Chat user={user} onBack={goHome}/>;
      case 'c-training': return <TrainingMod user={user} onBack={goHome}/>;
      case 'c-feedback': return <Feedback user={user} onBack={goHome}/>;
      case 'c-export': return <Export user={user} onBack={goHome}/>;
      case 'c-profile': return <ClientProfile user={user} onLogout={logout}/>;
      // Admin
      case 'a-home': return <AdminHome user={user} onNav={aNav}/>;
      case 'a-clients': return <AdminClients user={user} onBack={goHome} onSelect={c=>{setSelClient(c);setScreen('a-client');}}/>;
      case 'a-client': return <AdminClientDetail client={selClient} onBack={()=>setScreen('a-clients')} onChat={()=>setScreen('a-chat')}/>;
      case 'a-chat': return <Chat user={user} onBack={()=>setScreen('a-client')} otherUser={selClient} isAdmin/>;
      case 'a-broadcast': return <Broadcast user={user} onBack={goHome}/>;
      case 'a-profile': return <div style={{height:'100%',overflowY:'auto',padding:'52px 20px 90px',background:B.black}}>
        <h1 style={{fontSize:23,fontWeight:800,marginBottom:24}}>Ajustes Admin</h1>
        <div style={{display:'flex',alignItems:'center',gap:14,padding:18,background:B.card,borderRadius:18,marginBottom:22,border:`1px solid ${B.g700}`}}>
          <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${B.accent},${B.accentD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:B.black}}>P</div>
          <div><div style={{fontSize:17,fontWeight:700}}>Pablo — APD Sport</div><div style={{fontSize:12,color:B.accent}}>Administrador</div><div style={{fontSize:11,color:B.g500}}>admin@apdsport.com</div></div>
        </div>
        <div style={{background:`${B.accent}06`,border:`1px solid ${B.accent}15`,borderRadius:14,padding:16,marginBottom:22}}>
          <div style={{fontSize:12,fontWeight:600,color:B.accent,marginBottom:6}}>Credenciales</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:B.g300,lineHeight:1.8}}>Email: admin@apdsport.com<br/>Pass: APD2026!Sport</div>
        </div>
        <Btn full v="danger" onClick={logout} s={{marginTop:24}}><I n="logout" s={17} c={B.white}/> Cerrar sesión</Btn>
      </div>;
      default: return <Onboarding onDone={()=>setScreen('login')}/>;
    }
  };

  return <>
    <style>{CSS}</style>
    <div style={{width:'100%',maxWidth:420,height:'100vh',margin:'0 auto',position:'relative',overflow:'hidden',background:B.black}}>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {r()}
      {showClientTabs&&<TabBar tabs={clientTabs} active={tab} onNav={cNav}/>}
      {showAdminTabs&&<TabBar tabs={adminTabs} active={tab} onNav={aNav}/>}
    </div>
  </>;
}
