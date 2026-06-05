
const { useState, useEffect, useCallback } = React;

function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch(e) {
      alert("로그인 실패: " + e.message);
      setLoading(false);
    }
  };
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"linear-gradient(135deg,#7BC67E,#5BAD5E)",padding:24}}>
      <div style={{fontSize:52,marginBottom:16}}>🥣</div>
      <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:8}}>이든이 베이비 밀프랩</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",marginBottom:40}}>건강한 한 끼를 기록해요 🌱</div>
      <button onClick={signIn} disabled={loading}
        style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"none",borderRadius:16,padding:"14px 28px",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
        <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
        {loading ? "로그인 중..." : "Google로 시작하기"}
      </button>
    </div>
  );
}

const STORAGE_KEYS = { r:"bf_r6", s:"bf_s6", c:"bf_c6", d:"bf_d6", cat:"bf_cat2", making:"bf_making1", snack:"bf_snack1", vacc:"bf_vacc1", unit:"bf_unit1" };
const LEGACY_KEYS = {
  r:   ["bf_r5","bf_r4","bf_r3"],
  s:   ["bf_s5","bf_s4","bf_s3"],
  c:   ["bf_c5","bf_c4","bf_c3"],
  d:   ["bf_d5","bf_d4","bf_d3"],
  cat: ["bf_cat1"],
};

async function dbGet(key) {
  try { const x = await window.storage.get(key, true); return x ? JSON.parse(x.value) : null; }
  catch(e) { return null; }
}
async function dbSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), true); } catch(e) {}
}
async function dbGetLocal(key) {
  try { const x = await window.storage.get(key, false); return x ? JSON.parse(x.value) : null; }
  catch(e) { return null; }
}

const uid = () => Math.random().toString(36).slice(2,9);
const todayStr = () => { const d = new Date(); const kst = new Date(d.getTime() + 9*60*60*1000); return kst.toISOString().slice(0,10); };
const fmtMD = d => { const [,m,day]=d.split("-"); return `${m}/${day}`; };
const fmtFull = d => { const [y,m,day]=d.split("-"); return `${y}년 ${m}월 ${day}일`; };
const MEALS = ["아침","점심","저녁"];
const MEAL_ICON = {아침:"🌅",점심:"☀️",저녁:"🌙"};
const MEAL_BG = {아침:"#FFE0A3",점심:"#C8F0C0",저녁:"#C5D5F5"};
const WEEKDAYS = ["월","화","수","목","금","토","일"];
const SLOT_COLORS = ["#FFE4B5","#B0E8D0","#B8D4F8","#F8C8C8","#E8C8F8","#F8EAB0"];
