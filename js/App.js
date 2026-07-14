function App({ user }) {
  const [tab, setTab] = useState(0);
  const [recipes, setRecipesRaw] = useState([]);
  const [schedules, setSchedulesRaw] = useState([]);
  const [cubes, setCubesRaw] = useState([]);
  const [dishes, setDishesRaw] = useState([]);
  const [categories, setCategoriesRaw] = useState([]);
  const [makingIds, setMakingIdsRaw] = useState([]);
  const [snacks, setSnacksRaw] = useState([]);
  const [vaccData, setVaccDataRaw] = useState({birth:"",appointments:[],customVaccs:[]});
  const [babyName, setBabyNameRaw] = useState("이든이");
  const [ready, setReady] = useState(false);
  const saveEnabled = React.useRef(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const init = async () => {
        console.log("🚀 init 시작, user.uid:", user?.uid);
        const uid = user.uid;
        const fsGet = async (key) => {
          const doc = await firebase.firestore().collection("users").doc(uid).collection("data").doc(key).get();
          console.log("fsGet", key, "exists:", doc.exists);
          if (!doc.exists) return null;
          const val = doc.data().value;
          if (typeof val === "string") { try { return JSON.parse(val); } catch(e) { return val; } }
          return val;
        };
        const loadWithMigration = async (key, legacyKeys) => {
          const shared = await fsGet(key);
          if (shared) return shared;
          for (const old of legacyKeys) {
            const val = await dbGetLocal(old);
            if (val) { await dbSet(key, val); return val; }
          }
          return null;
        };
        // ★ Firebase 읽기 실패 시 절대 초기 데이터로 덮어쓰지 않음
        const r   = await loadWithMigration(STORAGE_KEYS.r,   LEGACY_KEYS.r);
        const s   = await loadWithMigration(STORAGE_KEYS.s,   LEGACY_KEYS.s);
        const c   = await loadWithMigration(STORAGE_KEYS.c,   LEGACY_KEYS.c);
        const d   = await loadWithMigration(STORAGE_KEYS.d,   LEGACY_KEYS.d);
        const cat = await loadWithMigration(STORAGE_KEYS.cat, LEGACY_KEYS.cat);
        const making = await fsGet(STORAGE_KEYS.making);
        const snack = await fsGet(STORAGE_KEYS.snack);
        const vacc = await fsGet(STORAGE_KEYS.vacc);
        const unit = await fsGet(STORAGE_KEYS.unit);
        const bname = await fsGet("bf_babyname");
        
        // ★ 마이그레이션: 기존 unitRecipes를 recipes에 type 필드와 함께 통합
        const mergeRecipesAndUnits = (recipesArr, unitArr) => {
          const withType = (recipesArr || []).map(x => ({...x, type: x.type || "일반"}));
          const existingIds = new Set(withType.map(x => x.id));
          const migratedUnits = (unitArr || [])
            .filter(u => !existingIds.has(u.id)) // 이미 합쳐진 항목은 재추가 안 함 (idempotent)
            .map(u => ({
              id: u.id, name: u.name, color: u.color || "#7BC67E", note: u.note || "",
              type: u.type || "기타", ingredients: u.ingredients || [],
              unitIds: [], dishId: "", slotMap: {}, slotUnits: {},
              favorite: false, updatedAt: u.updatedAt || ""
            }));
          return [...withType, ...migratedUnits];
        };
        console.log("📦 r:", r, "setRecipes 호출");
        // 로드된 데이터가 배열인지 검증 후 세팅 (빈 배열/null이어도 안전하게 처리)
        setRecipesRaw(mergeRecipesAndUnits(Array.isArray(r) ? r : [], Array.isArray(unit) ? unit : []));
        setSchedulesRaw(Array.isArray(s) ? s : []);
        setCubesRaw(Array.isArray(c) ? c : []);
        setDishesRaw(Array.isArray(d) && d.length > 0 ? d : INIT_DISHES);
        setCategoriesRaw(Array.isArray(cat) && cat.length > 0 ? cat : INIT_CATEGORIES);
        setMakingIdsRaw(Array.isArray(making) ? making : []);
        setSnacksRaw(Array.isArray(snack) ? snack : []);
        setVaccDataRaw(vacc && typeof vacc === "object" && vacc.appointments ? vacc : {birth:"",appointments:[],customVaccs:[]});
        setBabyNameRaw(typeof bname === "string" && bname.trim() ? bname : "이든이");
        setReady(true);
        setTimeout(() => { saveEnabled.current = true; }, 1000); // 1초 후 저장 활성화
      };
      try {
        await init();
      } catch(e) {
        console.error("🚨 데이터 로드 실패 (권한 오류 등):", e.message);
        // 에러 시 절대 데이터 덮어쓰지 않고 로딩 화면 유지
        // 사용자에게 안내
        setReady("error");
      }
    });
    return unsub;
  }, []);

  const setRecipes    = useCallback(fn=>{setRecipesRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});},[]);
  const setSchedules  = useCallback(fn=>{setSchedulesRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});},[]);
  const setCubes      = useCallback(fn=>{setCubesRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});},[]);
  const setDishes     = useCallback(fn=>{setDishesRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});},[]);
  const setCategories = useCallback(fn=>{setCategoriesRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});}, []);
  const setMakingIds  = useCallback(fn=>{setMakingIdsRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});}, []);
  const setSnacks     = useCallback(fn=>{setSnacksRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});}, []);
  const setVaccData   = useCallback(fn=>{setVaccDataRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});}, []);
  const setBabyName   = useCallback(fn=>{setBabyNameRaw(p=>{const n=typeof fn==="function"?fn(p):fn;return n;});}, []);

  // 저장 재시도 헬퍼
  const fsSave = (uid, key, value) => {
    const attempt = (n) => {
      firebase.firestore().collection("users").doc(uid).collection("data").doc(key)
        .set({value: JSON.stringify(value)})
        .catch(e => {
          if (n < 3) setTimeout(() => attempt(n + 1), 2000 * n);
          else console.error("💾 저장 실패 (3회):", key, e.message);
        });
    };
    attempt(1);
  };
  
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.r,recipes); },[recipes,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.s,schedules); },[schedules,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.c,cubes); },[cubes,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.d,dishes); },[dishes,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.cat,categories); },[categories,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.making,makingIds); },[makingIds,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.snack,snacks); },[snacks,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,STORAGE_KEYS.vacc,vaccData); },[vaccData,ready]);
  useEffect(()=>{ if(!ready||typeof ready!=="boolean") return; if(!saveEnabled.current) return; const uid=firebase.auth().currentUser?.uid; if(!uid) return; fsSave(uid,"bf_babyname",babyName); },[babyName,ready]);
  
  // unitRecipes를 전역으로 노출 (calcStock 내부에서 접근)
  window._unitRecipes = recipes;
  const { stock, status } = calcStock(cubes, schedules, recipes);
  const hasEmpty = Object.values(stock).some(v=>v===0);
  const lastUpdated = [...recipes.map(r=>r.updatedAt||""), ...cubes.map(c=>c.updatedAt||"")].filter(Boolean).sort().reverse()[0] || null;

  if (ready === "error") return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",padding:32,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
      <div style={{fontWeight:700,fontSize:18,color:"#333",marginBottom:8}}>데이터를 불러올 수 없어요</div>
      <div style={{fontSize:14,color:"#888",marginBottom:24,lineHeight:1.8}}>Firebase 권한 오류가 발생했어요.<br/>Firebase 콘솔에서 Security Rules를 확인해주세요.</div>
      <button onClick={()=>window.location.reload()} style={{background:"#7BC67E",color:"#fff",border:"none",borderRadius:14,padding:"12px 28px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
        새로고침
      </button>
    </div>
  );
  if (!ready) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#aaa",fontSize:16}}>로딩 중...</div>;

  const TABS = [
    { label:"📅 일정", el:<ScheduleTab recipes={recipes} schedules={schedules} setSchedules={setSchedules} cubes={cubes} dishes={dishes} recipeStatus={status} stock={stock} unitRecipes={recipes} /> },
    { label:"🍳 식단", el:<RecipeTab recipes={recipes} setRecipes={setRecipes} cubes={cubes} recipeStatus={status} dishes={dishes} stock={stock}  /> },
    { label:"🧊 재고관리",   el:<CubeTab recipes={recipes} cubes={cubes} setCubes={setCubes} stock={stock} recipeStatus={status} categories={categories} setCategories={setCategories} makingIds={makingIds} setMakingIds={setMakingIds} /> },
    { label:"🍽️ 식기",  el:<DishTab dishes={dishes} setDishes={setDishes} /> },
    { label:"📖 블로그", el:<BlogTab /> },
    { label:"⚙️ 설정", el:<SettingTab babyName={babyName} setBabyName={setBabyName} /> },
  ];

  return(
    <div style={{maxWidth:640,margin:"0 auto",minHeight:"100vh",background:"#F8FBF8",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#7BC67E 0%,#5BAD5E 100%)",padding:"24px 20px 20px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>🍼 베이비 밀프랩</div>
          {lastUpdated && <div style={{fontSize:10,opacity:0.75,background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"3px 9px",marginTop:4}}>v{lastUpdated}</div>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
          <div style={{fontSize:12,opacity:0.85}}>{babyName}의 건강한 한 끼 🌱</div>
          <button onClick={()=>auth.signOut()} style={{fontSize:11,background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,padding:"4px 10px",color:"#fff",cursor:"pointer"}}>
            {user&&user.displayName?user.displayName.split(" ")[0]:""} 로그아웃
          </button>
        </div>
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:"1.5px solid #f0f0f0",position:"sticky",top:0,zIndex:10}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)}
            style={{flex:1,padding:"12px 2px",border:"none",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:tab===i?700:400,color:tab===i?"#7BC67E":"#999",borderBottom:tab===i?"2.5px solid #7BC67E":"2.5px solid transparent",position:"relative"}}>
            {t.label}        
          </button>
        ))}
      </div>
      <div style={{padding:"20px 16px 40px"}}>{TABS[tab].el}</div>
      {(tab===1||tab===2||tab===3) && (
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
          style={{position:"fixed",bottom:24,right:20,width:44,height:44,borderRadius:"50%",background:"#7BC67E",color:"#fff",border:"none",fontSize:20,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,0,0,0.2)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ↑
        </button>
      )}
    </div>
  );
}

function InstallBanner() {
  const [show, setShow] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    // 이미 설치됐거나, 닫은 적 있으면 표시 안 함
    if (isInStandalone) return;
    // URL에 ?install=1 이면 강제 표시 (테스트용)
    const forceShow = new URLSearchParams(window.location.search).get('install');
    if (!forceShow && sessionStorage.getItem('installBannerDismissed')) return;
    // Android: beforeinstallprompt 이벤트 캐치
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // iOS나 기타 브라우저도 표시
    // 1.5초 후 배너 표시 (Android는 beforeinstallprompt가 오면 덮어씀)
    setTimeout(()=>setShow(true), 1500);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android Chrome: 시스템 설치 프롬프트
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') { setShow(false); }
      setDeferredPrompt(null);
    } else {
      // iOS or 기타: 가이드 표시
      setShowGuide(true);
    }
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('installBannerDismissed', '1');
  };

  if (!show) return null;

  return (
    <>
      {/* 하단 배너 */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9999,
        background:"#fff",borderTop:"2px solid #7BC67E",
        padding:"12px 16px",boxShadow:"0 -4px 20px rgba(0,0,0,0.1)",
        display:"flex",alignItems:"center",gap:12}}>
        <img src="icon-192.png" style={{width:40,height:40,borderRadius:10,flexShrink:0}} alt="icon" />
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:"#333"}}>베이비 밀프랩</div>
          <div style={{fontSize:11,color:"#888"}}>홈 화면에 추가하면 앱처럼 사용해요!</div>
        </div>
        <button onClick={handleInstall}
          style={{background:"#7BC67E",color:"#fff",border:"none",borderRadius:10,
            padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          추가
        </button>
        <button onClick={dismiss}
          style={{background:"#f0f0f0",color:"#888",border:"none",borderRadius:10,
            padding:"8px 10px",fontSize:12,cursor:"pointer",flexShrink:0}}>
          ✕
        </button>
      </div>

      {/* iOS 가이드 모달 */}
      {showGuide && (
        <div onClick={()=>setShowGuide(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10000,
            display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480}}>
            <div style={{fontWeight:700,fontSize:16,color:"#333",marginBottom:16,textAlign:"center"}}>
              📲 홈 화면에 추가하기
            </div>
            {isIOS ? (<>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,padding:"12px",background:"#f9f9f9",borderRadius:12}}>
                <div style={{fontSize:24,flexShrink:0}}>1️⃣</div>
                <div><div style={{fontWeight:600,fontSize:13,color:"#333",marginBottom:2}}>하단 공유 버튼 탭</div>
                <div style={{fontSize:12,color:"#888"}}>Safari 하단 가운데 □↑ 버튼을 탭하세요</div></div>
              </div>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,padding:"12px",background:"#f9f9f9",borderRadius:12}}>
                <div style={{fontSize:24,flexShrink:0}}>2️⃣</div>
                <div><div style={{fontWeight:600,fontSize:13,color:"#333",marginBottom:2}}>"홈 화면에 추가" 선택</div>
                <div style={{fontSize:12,color:"#888"}}>스크롤해서 "홈 화면에 추가"를 탭하세요</div></div>
              </div>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20,padding:"12px",background:"#f9f9f9",borderRadius:12}}>
                <div style={{fontSize:24,flexShrink:0}}>3️⃣</div>
                <div><div style={{fontWeight:600,fontSize:13,color:"#333",marginBottom:2}}>"추가" 탭</div>
                <div style={{fontSize:12,color:"#888"}}>오른쪽 상단 "추가"를 탭하면 완료!</div></div>
              </div>
              <div style={{fontSize:11,color:"#aaa",textAlign:"center",marginBottom:16}}>⚠️ Safari에서만 홈 화면 추가가 가능해요</div>
            </>) : (<>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,padding:"12px",background:"#f9f9f9",borderRadius:12}}>
                <div style={{fontSize:24,flexShrink:0}}>1️⃣</div>
                <div><div style={{fontWeight:600,fontSize:13,color:"#333",marginBottom:2}}>Chrome 메뉴 열기</div>
                <div style={{fontSize:12,color:"#888"}}>우측 상단 ⋮ 버튼을 탭하세요</div></div>
              </div>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20,padding:"12px",background:"#f9f9f9",borderRadius:12}}>
                <div style={{fontSize:24,flexShrink:0}}>2️⃣</div>
                <div><div style={{fontWeight:600,fontSize:13,color:"#333",marginBottom:2}}>"홈 화면에 추가" 선택</div>
                <div style={{fontSize:12,color:"#888"}}>"앱 설치" 또는 "홈 화면에 추가"를 탭하세요</div></div>
              </div>
            </>)}
            <button onClick={()=>{setShowGuide(false);dismiss();}}
              style={{width:"100%",background:"#7BC67E",color:"#fff",border:"none",
                borderRadius:14,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Root() {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    return auth.onAuthStateChanged(u => {
      if (u) runMigration(u.uid);
      setUser(u || null);
    });
  }, []);
  if (user === undefined) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#aaa",fontSize:16}}>로딩 중...</div>;
  if (!user) return <LoginScreen />;
  return (
    <>
      <App user={user} />
      <InstallBanner />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Root />);
