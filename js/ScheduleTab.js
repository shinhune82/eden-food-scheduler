function ScheduleTab({ recipes, schedules, setSchedules, cubes, dishes, recipeStatus, vaccData, stock, unitRecipes }) {
  const [weekBase, setWeekBase] = useState(todayStr());
  const [modal, setModal] = useState(false);
  const [target, setTarget] = useState({date:"",meal:""});
  const [form, setForm] = useState({recipeId:"",dishId:"",amount:"",memo:"",checked:[],slots:{},customMode:false,customIngredients:[],customUnits:[],customSlotUnits:{},customSlotIngredients:{},slotUnits:{}});
  const [rdrop, setRdrop] = useState(false);
  const [ddrop, setDdrop] = useState(false);
  const [rdropSearch, setRdropSearch] = useState("");
  const [editSlots, setEditSlots] = useState(false);
  const [schedConfirmDel, setSchedConfirmDel] = useState(false);
  const [moveSource, setMoveSource] = useState(null); // {date, meal} - 이동할 원본 셀
  const [dayView, setDayView] = useState(todayStr());
  const [bannerOpen, setBannerOpen] = useState(false);
  const weekDates = getWeekDates(weekBase);
  const today = todayStr();
  const getEntry = (date, meal) => schedules.find(s=>s.date===date&&s.meal===meal);

  const openCell = (date, meal) => {
    const ex = getEntry(date, meal);
    const rId = ex ? (ex.recipeId||"") : "";
    const nowDisabled = rId && (recipeStatus[rId]||{}).disabled;
    setTarget({date,meal});
    const defRec = rId && !nowDisabled ? (rId==="__custom__" ? {id:"__custom__",name:"직접 구성",color:"#7BC67E",ingredients:[],unitIds:[]} : recipes.find(r=>r.id===rId)) : null;
    const rawSlots = ex && ex.slots && Object.keys(ex.slots).length>0 ? ex.slots : (defRec&&defRec.slotMap ? defRec.slotMap : {});
    const defDish  = ex ? (ex.dishId||"") : (defRec&&defRec.dishId ? defRec.dishId : "");
    // ★ 버그 수정: dish 슬롯 키 이름 불일치 보정
    const defDishObj = dishes.find(d=>d.id===defDish);
    const defSlots = defRec && defDishObj
      ? remapSlotsToDish(rawSlots, defDishObj.slots, defRec.ingredients)
      : (defRec ? rebuildSlotMap(rawSlots, defRec.ingredients) : rawSlots);
    const isExCustom = rId === "__custom__";
    setForm(ex
      ? {
          recipeId: nowDisabled?"":rId,
          dishId: defDish,
          amount: ex.amount||"",
          memo: ex.memo||"",
          checked: ex.checked||[],
          slots: defSlots,
          slotUnits: ex.slotUnits||{},
          // 직접구성 복원
          customMode: isExCustom,
          customIngredients: isExCustom ? (ex.customIngredients||[]) : [],
          customUnits: isExCustom ? (ex.customUnits||[]) : [],
          customSlotUnits: isExCustom ? (ex.slotUnits||{}) : {},
          customSlotIngredients: isExCustom ? (ex.slots||{}) : {},
        }
      : {recipeId:"",dishId:"",amount:"",memo:"",checked:[],slots:{},customMode:false,customIngredients:[],customUnits:[],customSlotUnits:{},customSlotIngredients:{},slotUnits:{}}
    );
    setRdrop(false); setDdrop(false); setEditSlots(false);
    setModal(true);
  };

  const pickRecipe = (id, recipeList) => {
    if ((recipeStatus[id]||{}).disabled) return;
    const rec = (recipeList||recipes).find(r=>r.id===id);
    const cleanSlots = rec && rec.slotMap ? rebuildSlotMap(rec.slotMap, rec.ingredients) : {};
    setForm(f=>({...f,recipeId:id,checked:[],slots:cleanSlots,dishId:rec&&rec.dishId?rec.dishId:""}));
    setRdrop(false);
  };
  const pickDish = id => {
    const newDish = dishes.find(d=>d.id===id);
    const rec = recipes.find(r=>r.id===form.recipeId);
    let newSlots = {};
    if (newDish && rec && rec.slotMap && Object.keys(rec.slotMap).length>0) {
      // ★ 새 식기로 변경 시에도 remapSlotsToDish 사용
      const remapped = remapSlotsToDish(rec.slotMap, newDish.slots, rec.ingredients);
      newDish.slots.forEach(slot => { if (remapped[slot]) newSlots[slot] = remapped[slot]; });
    }
    setForm(f=>({...f,dishId:id,slots:newSlots}));
    setDdrop(false);
  };
  const toggleCheck = name => setForm(f=>({...f,checked:f.checked.includes(name)?f.checked.filter(x=>x!==name):[...f.checked,name]}));

  const saveEntry = () => {
    if (!form.recipeId) return;
    if (!isCustomMode && (recipeStatus[form.recipeId]||{}).disabled) return;
    const entryData = {...form};
    // 직접 구성 모드: slotUnits에 customSlotUnits 합치기
    if(isCustomMode) {
      entryData.slotUnits = form.customSlotUnits||{};
      entryData.slots = form.customSlotIngredients||{};
      entryData.customIngredients = form.customIngredients||[];
      entryData.customUnits = form.customUnits||[];
    }
    setSchedules(ss=>[...ss.filter(s=>!(s.date===target.date&&s.meal===target.meal)), {id:uid(),date:target.date,meal:target.meal,...entryData}]);
    setModal(false);
  };
  const delEntry = () => { setSchedules(ss=>ss.filter(s=>!(s.date===target.date&&s.meal===target.meal))); setModal(false); };

  // 이동 함수
  const startMove = (date, meal, e) => {
    e.stopPropagation();
    const ent = getEntry(date, meal);
    if (!ent) return;
    setMoveSource({date, meal});
  };
  const doMove = (toDate, toMeal) => {
    if (!moveSource || moveSource === "standby") return;
    const { date: fromDate, meal: fromMeal } = moveSource;
    if (fromDate === toDate && fromMeal === toMeal) { setMoveSource(null); return; }
    const srcEntry = getEntry(fromDate, fromMeal);
    if (!srcEntry) { setMoveSource(null); return; }
    setSchedules(ss => {
      // 원본 제거, 대상에 덮어쓰기
      const filtered = ss.filter(s => !(s.date===fromDate&&s.meal===fromMeal) && !(s.date===toDate&&s.meal===toMeal));
      return [...filtered, {...srcEntry, id:uid(), date:toDate, meal:toMeal}];
    });
    setMoveSource(null);
  };

  const isCustomMode = form.recipeId === "__custom__";
  const customUnitIngredients = isCustomMode
    ? ((form.customUnits||[]).flatMap(uId=>{
        const u=(unitRecipes||[]).find(x=>x.id===uId);
        return u ? (u.ingredients||[]) : [];
      }))
    : [];
  const customRecipe = isCustomMode ? {
    id:"__custom__", name:"직접 구성", color:"#7BC67E",
    ingredients: [
      ...(form.customIngredients||[]).map(ci=>({name:ci.name, cubeCount:ci.count})),
      ...customUnitIngredients,
    ]
  } : null;
  const selRec = isCustomMode ? customRecipe : recipes.find(r=>r.id===form.recipeId);
  const selDish = dishes.find(d=>d.id===form.dishId);
  const disabledCount = Object.values(recipeStatus).filter(s=>s.disabled).length;

  return(
    <div>
      {disabledCount>0 && (
        <div style={{background:"#fff0f0",border:"1.5px solid #ffb3b3",borderRadius:12,marginBottom:14,overflow:"hidden"}}>
          <div onClick={()=>setBannerOpen(v=>!v)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",cursor:"pointer"}}>
            <span style={{fontWeight:700,fontSize:13,color:"#c00"}}>🚫 재료 소진 {disabledCount}개</span>
            <span style={{fontSize:11,color:"#e55"}}>{bannerOpen?"▲ 닫기":"▼ 목록 보기"}</span>
          </div>
          {bannerOpen && (
            <div style={{fontSize:11,color:"#e55",padding:"0 14px 10px",lineHeight:1.8}}>
              {recipes.filter(r=>(recipeStatus[r.id]||{}).disabled).map(r=>(
                <span key={r.id} style={{marginRight:8,display:"inline-block"}}>{r.name} ({(recipeStatus[r.id]||{}).outOfStock.join(", ")} 없음)</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 💉 예방접종 주간 알림 배너 */}
      {(()=>{
        const birth = vaccData && vaccData.birth;
        if (!birth) return null;
        const vaccDates = calcVaccDates(birth);
        const appts = (vaccData && vaccData.appointments) || [];
        const today2 = todayStr();
        // 이번 주 접종 예정 (예약된 날짜가 이번 주 내)
        const weekAppts = vaccDates.filter(item => {
          const a = appts.find(x=>x.vaccId===item.id);
          if (!a || !a.date || a.done) return false;
          return a.date >= weekDates[0] && a.date <= weekDates[6];
        });
        // 접종 시기 도래 (권장기간 내, 미완료)
        const dueSoon = vaccDates.filter(item => {
          const a = appts.find(x=>x.vaccId===item.id);
          if (a && a.done) return false;
          return item.dateMin <= weekDates[6] && item.dateMax >= today2;
        });
        if (weekAppts.length === 0 && dueSoon.length === 0) return null;
        return (
          <div style={{marginBottom:10}}>
            {weekAppts.length > 0 && (
              <div style={{background:"#f0f6ff",border:"1.5px solid #74B5F5",borderRadius:12,padding:"8px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:13}}>📅</span>
                <span style={{fontWeight:700,fontSize:12,color:"#48a",flex:1}}>
                  이번 주 접종 예약: {weekAppts.map(v=>{
                    const a=appts.find(x=>x.vaccId===v.id);
                    return v.abbr+(v.totalDoses>1?" "+v.dose+"차":"")+" ("+fmtMD(a.date)+")";
                  }).join(", ")}
                </span>
              </div>
            )}
            {dueSoon.length > 0 && (
              <div style={{background:"#fff8f0",border:"1.5px solid #F4A261",borderRadius:12,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:13}}>💉</span>
                <span style={{fontWeight:700,fontSize:12,color:"#c85",flex:1}}>
                  접종 시기: {dueSoon.map(v=>v.abbr+(v.totalDoses>1?" "+v.dose+"차":"")).join(", ")}
                </span>
              </div>
            )}
          </div>
        );
      })()}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()-7);setWeekBase(d.toISOString().slice(0,10));}} style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 14px",cursor:"pointer",fontSize:18}}>&#8249;</button>
        <span style={{fontWeight:700,color:"#333",fontSize:14}}>{fmtMD(weekDates[0])} ~ {fmtMD(weekDates[6])}</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>{ if(moveSource) setMoveSource(null); else setMoveSource("standby"); }}
            style={{background:moveSource?"#fff3cd":"#f0f0f0",border:"1.5px solid "+(moveSource?"#f9a825":"transparent"),borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:13,color:moveSource?"#b45309":"#888",fontWeight:moveSource?700:400}}>
            {moveSource==="standby"?"📦 셀 선택":moveSource?"📦 위치 선택":"📦 이동"}
          </button>
          <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()+7);setWeekBase(d.toISOString().slice(0,10));}} style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 14px",cursor:"pointer",fontSize:18}}>&#8250;</button>
        </div>
      </div>
      <div style={{overflowX:"auto",marginBottom:14}}>
        <div style={{minWidth:520}}>
          <div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:3,marginBottom:4}}>
            <div/>
            {weekDates.map((d,i) => (
              <div key={d} onClick={()=>setDayView(d)}
                style={{textAlign:"center",fontSize:11,fontWeight:700,color:d===today?"#7BC67E":i>=5?"#E78F8F":"#888",padding:"4px 0",cursor:"pointer",background:dayView===d?"#e8f8f0":"transparent",borderRadius:8}}>
                {WEEKDAYS[i]}<br/><span style={{fontSize:13,color:d===today?"#7BC67E":"#555"}}>{fmtMD(d).slice(3)}</span>
                {(()=>{
                  if (!vaccData || !vaccData.birth) return null;
                  const dayAppts = (vaccData.appointments||[]).filter(a => {
                    if (a.done) return false;
                    return a.date === d;
                  });
                  const dayDue = calcVaccDates(vaccData.birth).filter(item => {
                    const a = (vaccData.appointments||[]).find(x=>x.vaccId===item.id);
                    return a && !a.done && a.date === d;
                  });
                  if (dayDue.length === 0) return null;
                  return <div style={{fontSize:9,color:"#74B5F5",fontWeight:700,marginTop:1}}>💉{dayDue.length}</div>;
                })()}
              </div>
            ))}
          </div>
          {MEALS.map(meal => (
            <div key={meal} style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:3,marginBottom:3}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#777",background:MEAL_BG[meal],borderRadius:10,flexDirection:"column",padding:"4px 0"}}>
                <span style={{fontSize:13}}>{MEAL_ICON[meal]}</span>{meal}
              </div>
              {weekDates.map(d => {
                const ent = getEntry(d, meal);
                const rec = ent ? (ent.recipeId==="__custom__"
                  ? {id:"__custom__",name:"직접 구성",color:"#7BC67E",ingredients:[],unitIds:[]}
                  : recipes.find(r=>r.id===ent.recipeId)) : null;
                const dis = rec && rec.id!=="__custom__" && (recipeStatus[rec.id]||{}).disabled;
                const vol = rec ? cubeVolume(rec,cubes,unitRecipes) : 0;
                const entSlotTokens = ent && ent.slots ? Object.values(ent.slots).flat() : [];
                const entChecked = ent && ent.checked ? ent.checked : [];
                const entTokens = entSlotTokens.length>0 ? entSlotTokens : (rec ? ingredientsToTokens(rec.id==="__custom__" ? [] : rec.ingredients).map(t=>t.tokenKey) : []);
                const checkedInTokens = entTokens.filter(tk=>entChecked.includes(tk));
                const allDone = entTokens.length>0 && checkedInTokens.length===entTokens.length;
                const partDone = entTokens.length>0 && checkedInTokens.length>0 && !allDone;
                const isMoveSource = moveSource && moveSource !== "standby" && moveSource.date===d && moveSource.meal===meal;
                const isStandby = moveSource === "standby";
                const isMoveTarget = moveSource && moveSource !== "standby" && !(moveSource.date===d && moveSource.meal===meal);
                return(
                  <div key={d}
                    onClick={()=>{
                      if (moveSource === "standby") {
                        // 대기 상태: 원본 셀 선택
                        if (rec) setMoveSource({date:d, meal:meal});
                      } else if (moveSource) {
                        // 원본 선택됨: 목적지 선택
                        if (moveSource.date===d && moveSource.meal===meal) {
                          setMoveSource(null);
                        } else {
                          doMove(d,meal);
                        }
                      } else {
                        openCell(d,meal);
                      }
                    }}
                    style={{minHeight:72,borderRadius:10,cursor:moveSource?(rec||isMoveTarget?"copy":"not-allowed"):"pointer",padding:4,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",
                      background:isMoveSource?"#fff3cd":(isStandby&&rec?"#fffde7":(d===dayView?(rec?rec.color+"44":"#e8f8f0"):(dis?"#fff5f5":rec?rec.color+"22":"#f9f9f9"))),
                      border:isMoveSource?"2.5px dashed #f9a825":(isStandby&&rec?"2px dashed #f9a825":(isMoveTarget&&!rec?"2px dashed #7BC67E":(d===dayView?"2px solid #7BC67E":(dis?"1.5px solid #ffb3b3":rec?"1.5px solid "+rec.color+"55":"1.5px dashed #e0e0e0")))),
                      transition:"all 0.15s"}}>
                    {isMoveSource && <div style={{fontSize:9,color:"#b45309",fontWeight:700,marginBottom:2}}>📦 이동 중...</div>}
                    {rec ? (
                      <div style={{textAlign:"center",width:"100%"}}>
                        {dis && <div style={{fontSize:9,color:"#e55",fontWeight:700}}>🚫재료없음</div>}
                        <div style={{fontSize:10,fontWeight:700,color:dis?"#c88":"#444",lineHeight:1.3}}>{rec.id==="__custom__"?"✏️ 직접구성":rec.name}</div>
                        {vol>0 && <div style={{fontSize:9,color:"#4a9",marginTop:1}}>{vol}g</div>}
                        {allDone && !dis && <div style={{fontSize:9,color:"#4a9",fontWeight:700,marginTop:1}}>✓완료</div>}
                        {partDone && !dis && <div style={{fontSize:9,color:"#f90",fontWeight:700,marginTop:1}}>⚠부족</div>}

                      </div>
                    ) : <div style={{color:"#ccc",fontSize:18}}>+</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 일별 식단 */}
      <div style={{fontWeight:700,fontSize:14,color:"#333",marginBottom:8}}>{fmtMD(dayView)} 식단</div>
      {MEALS.map(meal=>{
        const ent = getEntry(dayView, meal);
        const rec = ent ? (ent.recipeId==="__custom__"
          ? {id:"__custom__",name:"직접 구성",color:"#7BC67E",ingredients:[],unitIds:[]}
          : recipes.find(r=>r.id===ent.recipeId)) : null;
        const dis = rec && rec.id!=="__custom__" && (recipeStatus[rec.id]||{}).disabled;
        const dish = ent ? dishes.find(d=>d.id===ent.dishId) : null;
        // ★ 버그 수정: 일별 뷰에서도 remapSlotsToDish 적용
        // 직접구성 모드: 실제 재료 계산
        const customIngList = (ent && ent.recipeId==="__custom__")
          ? [
              ...(ent.customIngredients||[]).map(ci=>({name:ci.name,cubeCount:ci.count})),
              ...(ent.customUnits||[]).flatMap(uId=>{
                const u=(unitRecipes||[]).find(x=>x.id===uId);
                return u ? (u.ingredients||[]) : [];
              })
            ]
          : null;
        // rec에 실제 재료 주입 (직접구성)
        const recWithIngs = rec && rec.id==="__custom__"
          ? {...rec, ingredients: customIngList||[]}
          : rec;
        const rawSlots = ent && ent.slots && Object.values(ent.slots).flat().length>0 ? ent.slots : (recWithIngs && recWithIngs.slotMap ? recWithIngs.slotMap : {});
        const slots = recWithIngs && dish
          ? remapSlotsToDish(rawSlots, dish.slots, recWithIngs.ingredients)
          : (recWithIngs ? rebuildSlotMap(rawSlots, recWithIngs ? recWithIngs.ingredients : []) : rawSlots);
        const hasSlots = dish && dish.slots && dish.slots.length>0;
        const allIngNames = recWithIngs ? recWithIngs.ingredients.map(i=>i.name) : [];
        const checked = ent && ent.checked ? ent.checked : [];
        const toggleDayCheck = (tokenKey) => {
          const newChecked = checked.includes(tokenKey) ? checked.filter(x=>x!==tokenKey) : [...checked,tokenKey];
          setSchedules(ss=>ss.map(s=>s.date===dayView&&s.meal===meal ? {...s,checked:newChecked} : s));
        };
        const slotTokensList = Object.values(slots).flat();
        const allTokens = slotTokensList.length>0
          ? slotTokensList
          : (recWithIngs ? ingredientsToTokens(recWithIngs.ingredients).map(t=>t.tokenKey) : []);
        const totalTokens = allTokens.length;
        const checkedInSlot = allTokens.filter(tk=>checked.includes(tk));
        const isAllChecked = totalTokens > 0 && checkedInSlot.length === totalTokens;
        const isPartialChecked = totalTokens > 0 && checkedInSlot.length > 0 && !isAllChecked;
        return(
          <div key={meal} style={{background:ent?(dis?"#fff0f0":rec?rec.color+"18":"#f9f9f9"):"#f9f9f9",
            border:"1.5px solid "+(ent?(dis?"#ffb3b3":rec?rec.color+"66":"#e0e0e0"):"#e8e8e8"),
            borderRadius:14,marginBottom:8,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",borderBottom:ent?"1px solid "+(rec?rec.color+"33":"#eee"):"none"}}>
              <div onClick={()=>openCell(dayView,meal)}
                style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"12px 16px",cursor:"pointer"}}>
                <span style={{fontSize:18}}>{MEAL_ICON[meal]}</span>
                <span style={{fontWeight:700,fontSize:13,color:"#555"}}>{meal}</span>
                {ent && rec && <span style={{fontWeight:700,fontSize:14,color:dis?"#e55":rec.color}}>{dis&&"🚫 "}{rec.name}</span>}
                {!ent && <span style={{fontSize:12,color:"#bbb"}}>+ 추가</span>}
                {dish && <span style={{fontSize:11,color:"#777"}}>{dish.icon} {dish.name}</span>}
                {ent && rec && isAllChecked && <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"#4a9",background:"#e8f8f0",borderRadius:20,padding:"2px 8px"}}>✓ 완료</span>}
                {ent && rec && isPartialChecked && <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"#f90",background:"#fff8e1",borderRadius:20,padding:"2px 8px"}}>⚠ 부족</span>}
              </div>

            </div>
            {ent && ent.memo && (
              <div style={{fontSize:12,color:"#666",padding:"6px 14px",background:"#fffde7",borderBottom:"1px solid #fff3cd",display:"flex",alignItems:"center",gap:6}}>
                <span style={{flexShrink:0}}>📝</span>
                <span style={{flex:1}}>{ent.memo}</span>
              </div>
            )}
            {ent && rec && (
              <div style={{padding:"10px 16px"}}>
                {rec.id==="__custom__" && (
                  <div>
                    {(ent.customUnits||[]).length>0 && (
                      <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:6}}>
                        {(ent.customUnits||[]).map((uId,uidx)=>{
                          const u=(unitRecipes||[]).find(x=>x.id===uId);
                          if(!u) return null;
                          return <span key={uidx} style={{background:u.color+"22",border:"1.5px solid "+u.color+"88",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600}}>🍱 {u.name}</span>;
                        })}
                      </div>
                    )}
                    {hasSlots && Object.values(slots).flat().length>0 && dish.slots.map((slot,si)=>{
                      const slotTokens=(slots[slot]||[]);
                      const tokensToShow=slotTokens.map(tk=>({tokenKey:tk,ingName:tk.split("__g")[0]})).filter(Boolean);
                      if(tokensToShow.length===0) return null;
                      const obj2=Object.values(slots).flat().map(tk=>({tokenKey:tk,ingName:tk.split("__g")[0]}));
                      const allChk2=tokensToShow.every(t=>checked.includes(t.tokenKey));
                      return(
                        <div key={slot} style={{marginBottom:8,borderRadius:12,border:"1.5px solid "+(allChk2?"#7BC67E":"#e0e0e0"),overflow:"hidden"}}>
                          <div style={{background:allChk2?"#e8f8f0":"#f5f5f5",padding:"5px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,fontWeight:700,color:"#555"}}>📌 {slot}</span>
                            <span style={{fontSize:11,color:allChk2?"#4a9":"#aaa",fontWeight:600}}>{tokensToShow.filter(t=>checked.includes(t.tokenKey)).length}/{tokensToShow.length}</span>
                          </div>
                          <div style={{padding:"8px 10px",display:"flex",flexWrap:"wrap",gap:6}}>
                            {tokensToShow.map(({tokenKey,ingName})=>(
                              <label key={tokenKey} onClick={e=>e.stopPropagation()}
                                style={{display:"flex",alignItems:"center",gap:4,background:checked.includes(tokenKey)?"#e8f8f0":"#fff",border:"1px solid "+(checked.includes(tokenKey)?"#7BC67E":"#ddd"),borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:12}}>
                                <input type="checkbox" checked={checked.includes(tokenKey)} onChange={()=>toggleDayCheck(tokenKey)} style={{cursor:"pointer",accentColor:"#7BC67E"}}/>
                                {tokenLabel(tokenKey,obj2)}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {!(hasSlots && Object.values(slots).flat().length>0) && (ent.customIngredients||[]).length>0 && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>재료 체크</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {ingredientsToTokens((ent.customIngredients||[]).map(ci=>({name:ci.name,cubeCount:ci.count}))).map(({tokenKey,ingName})=>(
                            <label key={tokenKey} onClick={e=>e.stopPropagation()}
                              style={{display:"flex",alignItems:"center",gap:4,background:checked.includes(tokenKey)?"#e8f8f0":"#f5f5f5",border:"1px solid "+(checked.includes(tokenKey)?"#7BC67E":"#ddd"),borderRadius:20,padding:"3px 10px",cursor:"pointer",fontSize:12}}>
                              <input type="checkbox" checked={checked.includes(tokenKey)} onChange={()=>toggleDayCheck(tokenKey)} style={{cursor:"pointer",accentColor:"#7BC67E"}}/>
                              {ingName}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {rec.id!=="__custom__" && (
                  <div>
                    {hasSlots && Object.values(slots).flat().length>0 && dish.slots.map((slot,si)=>{
                      const slotTokens=(slots[slot]||[]);
                      const tokensToShow=slotTokens.map(tk=>{
                        const ingName=tk.split("__g")[0];
                        const ing=recWithIngs?recWithIngs.ingredients.find(x=>x.name===ingName):null;
                        return ing?{tokenKey:tk,ingName}:null;
                      }).filter(Boolean);
                      if(tokensToShow.length===0) return null;
                      const objAll=Object.values(slots).flat().map(tk=>({tokenKey:tk,ingName:tk.split("__g")[0]}));
                      const allChk=tokensToShow.every(t=>checked.includes(t.tokenKey));
                      return(
                        <div key={slot} style={{marginBottom:8,borderRadius:12,border:"1.5px solid "+(allChk?"#7BC67E":"#e0e0e0"),overflow:"hidden"}}>
                          <div style={{background:allChk?"#e8f8f0":"#f5f5f5",padding:"5px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:11,fontWeight:700,color:"#555"}}>📌 {slot}</span>
                            {(()=>{
                              const sUnitId=ent.slotUnits&&ent.slotUnits[slot];
                              const sUnit=sUnitId&&unitRecipes?unitRecipes.find(u=>u.id===sUnitId):null;
                              if(!sUnit) return null;
                              return <span style={{fontSize:10,background:sUnit.color+"33",borderRadius:10,padding:"1px 6px",color:"#555",fontWeight:600}}>{sUnit.name}</span>;
                            })()}
                            <span style={{fontSize:11,color:allChk?"#4a9":"#aaa",fontWeight:600}}>{tokensToShow.filter(t=>checked.includes(t.tokenKey)).length}/{tokensToShow.length}</span>
                          </div>
                          <div style={{padding:"8px 10px",display:"flex",flexWrap:"wrap",gap:6}}>
                            {tokensToShow.map(({tokenKey,ingName})=>(
                              <label key={tokenKey} onClick={e=>e.stopPropagation()}
                                style={{display:"flex",alignItems:"center",gap:4,background:checked.includes(tokenKey)?"#e8f8f0":"#fff",border:"1px solid "+(checked.includes(tokenKey)?"#7BC67E":"#ddd"),borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:12}}>
                                <input type="checkbox" checked={checked.includes(tokenKey)} onChange={()=>toggleDayCheck(tokenKey)} style={{cursor:"pointer",accentColor:"#7BC67E"}}/>
                                {tokenLabel(tokenKey,objAll)}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {!(hasSlots && Object.values(slots).flat().length>0) && allIngNames.length>0 && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:6}}>재료 체크</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {ingredientsToTokens(recWithIngs.ingredients).map(({tokenKey,ingName})=>{
                            const lbl=tokenLabel(tokenKey,ingredientsToTokens(recWithIngs.ingredients));
                            return(
                              <label key={tokenKey} onClick={e=>e.stopPropagation()}
                                style={{display:"flex",alignItems:"center",gap:4,background:checked.includes(tokenKey)?"#e8f8f0":"#f5f5f5",border:"1px solid "+(checked.includes(tokenKey)?"#7BC67E":"#ddd"),borderRadius:20,padding:"3px 10px",cursor:"pointer",fontSize:12}}>
                                <input type="checkbox" checked={checked.includes(tokenKey)} onChange={()=>toggleDayCheck(tokenKey)} style={{cursor:"pointer",accentColor:"#7BC67E"}}/>
                                {lbl}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

      })}
      <Overlay open={modal} onClose={()=>setModal(false)} wide title={target.date ? fmtFull(target.date)+" "+MEAL_ICON[target.meal]+" "+target.meal : ""}>
        <div style={{marginBottom:12,position:"relative"}}>
          <div style={{fontSize:12,color:"#888",marginBottom:5}}>레시피 선택</div>
          <div onClick={()=>{setRdrop(o=>{if(!o)setRdropSearch("");return !o;});setDdrop(false);}} style={{padding:"10px 14px",border:"1.5px solid #e8e8e8",borderRadius:12,cursor:"pointer",background:"#fafafa",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            {selRec ? (
              <span style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:selRec.color,display:"inline-block"}} />
                <span style={{fontWeight:600,fontSize:14,color:"#333"}}>{selRec.name}</span>
              </span>
            ) : <span style={{color:"#bbb",fontSize:14}}>레시피를 선택하세요</span>}
            <span style={{color:"#aaa"}}>{rdrop?"▲":"▼"}</span>
          </div>
          {rdrop && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"#fff",border:"1.5px solid #e8e8e8",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",overflow:"hidden",marginTop:4}}>
              <div style={{padding:"8px 10px",borderBottom:"1px solid #f0f0f0"}}>
                <input autoFocus value={rdropSearch} onChange={e=>setRdropSearch(e.target.value)}
                  placeholder="레시피 검색..." onClick={e=>e.stopPropagation()}
                  style={{width:"100%",padding:"6px 10px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              {(()=>{
                const filtered = [...recipes].filter(r=>r.name.includes(rdropSearch));
                const favs = filtered.filter(r=>r.favorite).sort((a,b)=>a.name.localeCompare(b.name,"ko"));
                const others = filtered.filter(r=>!r.favorite).sort((a,b)=>a.name.localeCompare(b.name,"ko"));
                const showFav = !rdropSearch && favs.length>0;
                const showAll = !rdropSearch && favs.length>0 && others.length>0;
                const list = rdropSearch ? filtered.sort((a,b)=>a.name.localeCompare(b.name,"ko")) : [...favs,...others];
                return (<>
                  {/* 직접 구성 옵션 */}
                  {!rdropSearch && (
                    <div onClick={e=>{e.stopPropagation();setForm(f=>({...f,recipeId:"__custom__",customMode:true,customIngredients:[],checked:[],slots:{},dishId:""}));setRdrop(false);}}
                      style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                        background:form.recipeId==="__custom__"?"#e8f8f0":"#f9fff9",borderBottom:"2px solid #7BC67E"}}>
                      <span style={{fontSize:18}}>✏️</span>
                      <span style={{flex:1}}>
                        <span style={{fontWeight:700,fontSize:14,color:"#4a9"}}>직접 구성하기</span>
                        <span style={{display:"block",fontSize:11,color:"#7a9",marginTop:1}}>재고 있는 큐브로 오늘 메뉴 직접 선택</span>
                      </span>
                    </div>
                  )}
                  {showFav && <div style={{padding:"4px 14px",fontSize:10,fontWeight:700,color:"#f9a825",background:"#fffde7",borderBottom:"1px solid #fff9c4"}}>⭐ 즐겨찾기</div>}
                  {list.map((r,ri)=>{
                    const st = recipeStatus[r.id]||{disabled:false,outOfStock:[]};
                    const vol = cubeVolume(r,cubes);
                    const totalC = r.ingredients.reduce((s,x)=>s+(Number(x.cubeCount)||0),0);
                    return(<React.Fragment key={r.id}>
                      {showAll && ri===favs.length && <div style={{padding:"4px 14px",fontSize:10,fontWeight:700,color:"#999",background:"#fafafa",borderBottom:"1px solid #f0f0f0"}}>전체 레시피</div>}
                      <div onClick={e=>{e.stopPropagation();pickRecipe(r.id,recipes);}}
                        style={{padding:"12px 14px",cursor:st.disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,
                          background:st.disabled?"#fdf5f5":form.recipeId===r.id?r.color+"22":"#fff",
                          borderBottom:"1px solid #f5f5f5",opacity:st.disabled?0.65:1}}>
                        <span style={{width:12,height:12,borderRadius:"50%",background:st.disabled?"#ccc":r.color,flexShrink:0}} />
                        <span style={{flex:1}}>
                          <span style={{fontWeight:form.recipeId===r.id?700:400,fontSize:14,color:st.disabled?"#aaa":"#333"}}>{st.disabled&&"🚫 "}{r.name}{r.favorite?" ⭐":""}</span>
                          {st.disabled && <span style={{display:"block",fontSize:10,color:"#e55",marginTop:1}}>재고 없음: {st.outOfStock.join(", ")}</span>}
                        </span>
                        {!st.disabled && <span style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                          <span style={{fontSize:14,color:"#7a9",fontWeight:700}}>🧊{totalC}개</span>
                          {vol>0&&<span style={{fontSize:13,color:"#aaa",fontWeight:600}}>💧{vol}g</span>}
                        </span>}
                      </div>
                    </React.Fragment>);
                  })}
                </>);
              })()}
            </div>
          )}
        </div>
        {/* 직접 구성 모드: 큐브 선택 UI */}
        {isCustomMode && (
          <div style={{marginBottom:14}}>
{selRec && (
          <div style={{marginBottom:12,position:"relative"}}>
            <div style={{fontSize:12,color:"#888",marginBottom:5}}>식기 <span style={{fontSize:10,color:"#aaa"}}>(레시피 기본값, 변경 가능)</span></div>
            <div onClick={()=>{setDdrop(o=>!o);setRdrop(false);}}
              style={{padding:"10px 14px",border:"1.5px solid #e8e8e8",borderRadius:12,cursor:"pointer",background:"#fafafa",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {selDish ? (
                <span style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{selDish.icon}</span>
                  <span style={{fontWeight:600,fontSize:13,color:"#333"}}>{selDish.name}</span>
                </span>
              ) : <span style={{color:"#bbb",fontSize:13}}>식기 없음</span>}
              <span style={{color:"#aaa"}}>{ddrop?"▲":"▼"}</span>
            </div>
            {ddrop && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:"#fff",border:"1.5px solid #e8e8e8",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.1)",overflow:"hidden",marginTop:4}}>
                {dishes.map(d=>(
                  <div key={d.id} onClick={e=>{e.stopPropagation();pickDish(d.id);}}
                    style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                      background:form.dishId===d.id?"#e8f8f0":"#fff",borderBottom:"1px solid #f5f5f5"}}>
                    <span style={{fontSize:18}}>{d.icon}</span>
                    <span style={{fontSize:13,fontWeight:form.dishId===d.id?700:400,color:"#333"}}>{d.name}</span>
                    <span style={{fontSize:11,color:"#aaa",marginLeft:"auto"}}>{d.slots.join(" · ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="메모" value={form.memo} onChange={v=>setForm(f=>({...f,memo:v}))} placeholder="잘 먹음, 거부감 등..." />            {/* 식판 칸 배치 */}
            {selDish && ((form.customUnits||[]).length>0 || form.customIngredients.length>0) && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#4a9",fontWeight:700,marginBottom:6}}>🍽️ 식판 칸 배치</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(selDish.slots.length,3)+",1fr)",gap:6}}>
                  {selDish.slots.map((slot,si)=>(
                    <div key={slot} style={{borderRadius:10,border:"2px solid "+SLOT_COLORS[si],background:"#fff",padding:"8px 6px"}}>
                      <div style={{fontSize:10,fontWeight:700,textAlign:"center",marginBottom:6,color:"#555",background:SLOT_COLORS[si],borderRadius:6,padding:"2px 4px"}}>{slot}</div>
                      {/* 유닛 선택 */}
                      {(form.customUnits||[]).length>0 && (
                        <select
                          value={(form.customSlotUnits||{})[slot]||""}
                          onChange={e=>setForm(f=>({...f,customSlotUnits:{...(f.customSlotUnits||{}),[slot]:e.target.value||null}}))}
                          style={{width:"100%",fontSize:10,padding:"3px 4px",borderRadius:6,border:"1px solid #ddd",marginBottom:4,
                            background:(form.customSlotUnits||{})[slot]
                              ? (unitRecipes.find(u=>u.id===(form.customSlotUnits||{})[slot])?.color||"#fff")+"33"
                              : "#fafafa",cursor:"pointer"}}>
                          <option value="">유닛 없음</option>
                          {(form.customUnits||[]).map((uId,uidx)=>{
                            const u=unitRecipes.find(x=>x.id===uId);
                            if(!u) return null;
                            return <option key={uidx} value={uId}>{u.name}</option>;
                          })}
                        </select>
                      )}
                      {/* 큐브 배치 - 간단히 체크 */}
                      {form.customIngredients.map(ci=>{
                        const inSlot = ((form.customSlotIngredients||{})[slot]||[]).includes(ci.name);
                        const inOther = selDish.slots.filter(s=>s!==slot).some(s=>((form.customSlotIngredients||{})[s]||[]).includes(ci.name));
                        return(
                          <div key={ci.name}
                            onClick={()=>{
                              if(inOther) return;
                              setForm(f=>{
                                const cur = (f.customSlotIngredients||{})[slot]||[];
                                const next = inSlot ? cur.filter(x=>x!==ci.name) : [...cur,ci.name];
                                return {...f, customSlotIngredients:{...(f.customSlotIngredients||{}),[slot]:next}};
                              });
                            }}
                            style={{display:"flex",alignItems:"center",gap:4,padding:"3px 4px",borderRadius:6,cursor:inOther?"not-allowed":"pointer",
                              background:inSlot?SLOT_COLORS[si]:"transparent",opacity:inOther?0.35:1,fontSize:11,color:"#444"}}>
                            <span style={{width:12,height:12,borderRadius:3,border:"1.5px solid "+(inSlot?"#888":"#ccc"),
                              background:inSlot?"#fff":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {inSlot&&<span style={{fontSize:8,fontWeight:700}}>✓</span>}
                            </span>
                            {ci.name} x{ci.count}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 유닛 레시피 선택 */}
            {unitRecipes && unitRecipes.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#4a9",fontWeight:700,marginBottom:6}}>🍱 유닛 레시피 선택</div>
                {/* 선택된 유닛 목록 */}
                {(form.customUnits||[]).length > 0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                    {(form.customUnits||[]).map((uId,uidx)=>{
                      const u = unitRecipes.find(x=>x.id===uId);
                      if(!u) return null;
                      return(
                        <div key={uidx} style={{display:"flex",alignItems:"center",gap:4,
                          background:u.color+"22",border:"1.5px solid "+u.color+"88",
                          borderRadius:20,padding:"3px 10px",fontSize:12}}>
                          <span style={{fontSize:10,background:u.color+"44",borderRadius:10,padding:"1px 5px",color:"#555"}}>{u.type}</span>
                          <span style={{fontWeight:600,color:"#333"}}>{u.name}</span>
                          <button onClick={()=>setForm(f=>({...f,customUnits:(f.customUnits||[]).filter((_,i)=>i!==uidx)}))}
                            style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:13,padding:"0 2px"}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <select onChange={e=>{
                  const val = e.target.value;
                  if(!val) return;
                  setForm(f=>({...f, customUnits:[...(f.customUnits||[]), val]}));
                  e.target.value="";
                }} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,outline:"none",background:"#fafafa",cursor:"pointer"}}>
                  <option value="">+ 유닛 레시피 추가...</option>
                  {["밥","국","반찬","소스","기타"].map(type=>{
                    const filtered = (unitRecipes||[]).filter(u=>u.type===type);
                    if(filtered.length===0) return null;
                    return(
                      <optgroup key={type} label={type}>
                        {filtered.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
            <div style={{fontSize:12,color:"#4a9",fontWeight:700,marginBottom:8}}>✏️ 재고 있는 큐브 선택</div>
            {/* 영양 균형 현황 */}
            {(form.customIngredients||[]).length > 0 && (()=>{
              const catCount = {};
              form.customIngredients.forEach(ci=>{
                const cube = cubes.find(c=>c.ingredient===ci.name);
                const catId = cube?.categoryId || "기타";
                catCount[catId] = (catCount[catId]||0) + ci.count;
              });
              const catNames = {cat1:"곡류",cat2:"채소",cat3:"단백질",cat5:"구황작물",cat_dairy:"유제품",cat_mushroom:"버섯류",cat_seafood:"해산물",cat_seasoning:"맛내기"};
              const catColors = {cat1:"#FFE0A3",cat2:"#C8F0C0",cat3:"#F4C8C8",cat5:"#FFD6A5",cat_dairy:"#E8E8FF",cat_mushroom:"#E8D4B8",cat_seafood:"#C8E8FF",cat_seasoning:"#E8E8E8"};
              const hasGrain = catCount["cat1"] > 0;
              const hasVeg = catCount["cat2"] > 0;
              const hasProtein = catCount["cat3"] > 0 || catCount["cat_seafood"] > 0;
              const totalCubes = form.customIngredients.reduce((s,ci)=>s+ci.count,0);
              return (
                <div style={{background:"#f9f9f9",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:6,fontWeight:600}}>🥗 영양 균형</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                    {Object.entries(catCount).map(([catId,cnt])=>(
                      <span key={catId} style={{background:catColors[catId]||"#eee",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600,color:"#555"}}>
                        {catNames[catId]||catId} {cnt}개
                      </span>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:11}}>
                    <span style={{color:hasGrain?"#4a9":"#ddd",fontWeight:hasGrain?700:400}}>🌾 곡류{hasGrain?"✓":"?"}</span>
                    <span style={{color:hasVeg?"#4a9":"#ddd",fontWeight:hasVeg?700:400}}>🥦 채소{hasVeg?"✓":"?"}</span>
                    <span style={{color:hasProtein?"#4a9":"#ddd",fontWeight:hasProtein?700:400}}>🥩 단백질{hasProtein?"✓":"?"}</span>
                    <span style={{marginLeft:"auto",color:"#aaa"}}>총 {totalCubes}개</span>
                  </div>
                </div>
              );
            })()}
            {/* 카테고리별 큐브 목록 */}
            {(()=>{
              const availCubes = cubes.filter(c=>(stock[c.ingredient]||0)>0);
              const catGroups = {};
              const catNames = {cat1:"🌾 곡류",cat2:"🥦 채소",cat3:"🥩 단백질",cat5:"🍠 구황작물",cat_dairy:"🥛 유제품",cat_mushroom:"🍄 버섯류",cat_seafood:"🐟 해산물",cat_seasoning:"🧂 맛내기"};
              const catColors = {cat1:"#FFE0A3",cat2:"#C8F0C0",cat3:"#F4C8C8",cat5:"#FFD6A5",cat_dairy:"#E8E8FF",cat_mushroom:"#E8D4B8",cat_seafood:"#C8E8FF",cat_seasoning:"#E8E8E8"};
              const catOrder = ["cat1","cat5","cat3","cat_seafood","cat2","cat_mushroom","cat_dairy","cat_seasoning"];
              availCubes.forEach(c=>{
                const g = c.categoryId || "기타";
                if(!catGroups[g]) catGroups[g] = [];
                catGroups[g].push(c);
              });
              return catOrder.filter(k=>catGroups[k]?.length>0).map(catId=>(
                <div key={catId} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#666",marginBottom:5,padding:"2px 8px",background:catColors[catId]||"#eee",borderRadius:8,display:"inline-block"}}>
                    {catNames[catId]||catId}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {catGroups[catId].map(cube=>{
                      const sel = form.customIngredients.find(ci=>ci.name===cube.ingredient);
                      const selCount = sel?.count || 0;
                      const avail = stock[cube.ingredient]||0;
                      return(
                        <div key={cube.id}
                          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                            background:selCount>0?(catColors[catId]||"#e8f8f0"):"#f9f9f9",
                            border:"1.5px solid "+(selCount>0?(catColors[catId]||"#7BC67E")+"cc":"#e0e0e0"),
                            borderRadius:12,padding:"6px 8px",minWidth:60,cursor:"pointer",
                            transition:"all 0.1s"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#333",textAlign:"center"}}>{cube.ingredient}</div>
                          <div style={{fontSize:10,color:"#888"}}>{avail}개 재고</div>
                          {cube.weightG>0&&<div style={{fontSize:9,color:"#aaa"}}>{cube.weightG}g/개</div>}
                          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                            <button onClick={e=>{e.stopPropagation();setForm(f=>{
                              const cur = f.customIngredients.find(ci=>ci.name===cube.ingredient);
                              if(!cur||cur.count<=0) return f;
                              const next = cur.count-1;
                              return {...f, customIngredients: next===0
                                ? f.customIngredients.filter(ci=>ci.name!==cube.ingredient)
                                : f.customIngredients.map(ci=>ci.name===cube.ingredient?{...ci,count:next}:ci)};
                            });}}
                              style={{width:20,height:20,borderRadius:"50%",border:"1px solid #ccc",background:"#fff",cursor:"pointer",fontSize:13,lineHeight:"18px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",color:"#666",flexShrink:0}}>
                              −
                            </button>
                            <span style={{fontWeight:700,fontSize:13,color:selCount>0?"#333":"#ccc",minWidth:14,textAlign:"center"}}>{selCount}</span>
                            <button onClick={e=>{e.stopPropagation();if(selCount>=avail)return;setForm(f=>{
                              const cur = f.customIngredients.find(ci=>ci.name===cube.ingredient);
                              return {...f, customIngredients: cur
                                ? f.customIngredients.map(ci=>ci.name===cube.ingredient?{...ci,count:ci.count+1}:ci)
                                : [...f.customIngredients,{name:cube.ingredient,count:1}]};
                            });}}
                              style={{width:20,height:20,borderRadius:"50%",border:"1px solid "+(selCount>=avail?"#eee":"#7BC67E"),background:selCount>=avail?"#f9f9f9":"#7BC67E",cursor:selCount>=avail?"not-allowed":"pointer",fontSize:13,lineHeight:"18px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",color:selCount>=avail?"#ccc":"#fff",flexShrink:0}}>
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        
        {selRec && !isCustomMode && (
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:12,color:"#888",fontWeight:600}}>재료 준비 체크</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {selDish && selRec && (
                  <button onClick={()=>setEditSlots(v=>!v)}
                    style={{fontSize:11,padding:"2px 8px",borderRadius:8,border:"1px solid "+(editSlots?"#7BC67E":"#ddd"),
                      background:editSlots?"#e8f8f0":"#f9f9f9",color:editSlots?"#4a9":"#888",cursor:"pointer",fontWeight:editSlots?700:400}}>
                    {editSlots?"✓ 배치완료":"✏️ 이번만 수정"}
                  </button>
                )}
                {selDish && (
                  <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7a9"}}>
                    <span>{selDish.icon}</span><span>{selDish.name}</span>
                  </div>
                )}
              </div>
            </div>
            {editSlots && selDish && selRec ? (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#7a9",marginBottom:6,padding:"4px 8px",background:"#e8f8f0",borderRadius:8}}>📌 재료를 각 칸에 재배치하세요 (이번 일정만 적용)</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(selDish.slots.length,3)+",1fr)",gap:6}}>
                  {(()=>{
                    const tokens2 = ingredientsToTokens(selRec.ingredients);
                    return selDish.slots.map((slot,si)=>{
                      const slotKeys2 = form.slots[slot]||[];
                      return(
                        <div key={slot} style={{borderRadius:10,border:"2px solid "+SLOT_COLORS[si],background:"#fff",padding:"8px 6px"}}>
                          <div style={{fontSize:10,fontWeight:700,textAlign:"center",marginBottom:6,color:"#555",background:SLOT_COLORS[si],borderRadius:6,padding:"2px 4px"}}>{slot}</div>
                          {tokens2.map(tok=>{
                            const checked2 = slotKeys2.includes(tok.tokenKey);
                            const usedInOther = !checked2 && selDish.slots.filter(s=>s!==slot).some(s=>(form.slots[s]||[]).includes(tok.tokenKey));
                            const label2 = tokenLabel(tok.tokenKey, tokens2);
                            return(
                              <div key={tok.tokenKey}
                                onClick={()=>{
                                  if(usedInOther) return;
                                  setForm(f=>{
                                    const cur = f.slots[slot]||[];
                                    const next = cur.includes(tok.tokenKey)?cur.filter(x=>x!==tok.tokenKey):[...cur,tok.tokenKey];
                                    return {...f,slots:{...f.slots,[slot]:next}};
                                  });
                                }}
                                style={{display:"flex",alignItems:"center",gap:4,padding:"3px 4px",borderRadius:6,cursor:usedInOther?"not-allowed":"pointer",
                                  background:checked2?SLOT_COLORS[si]:"transparent",opacity:usedInOther?0.3:1,fontSize:11,color:"#444"}}>
                                <span style={{width:12,height:12,borderRadius:3,border:"1.5px solid "+(checked2?"#888":"#ccc"),background:checked2?"#fff":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {checked2&&<span style={{fontSize:8,fontWeight:700}}>✓</span>}
                                </span>
                                {label2}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : selDish ? (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(()=>{
                  const allSlotTokens = selDish.slots.flatMap(s=>form.slots[s]||[]);
                  const allSlotTokenObjs = allSlotTokens.map(tk=>({tokenKey:tk, ingName:tk.split("__g")[0]}));
                  return selDish.slots.map((slot,si)=>{
                    const slotTokens = form.slots[slot]||[];
                    const tokensToShow = slotTokens.map(tk=>{
                      const ingName = tk.split("__g")[0];
                      const ing = selRec.ingredients.find(x=>x.name===ingName);
                      return ing ? {tokenKey:tk, ingName, ing} : null;
                    }).filter(Boolean);
                    if(tokensToShow.length===0) return null;
                    const allChecked = tokensToShow.every(t=>form.checked.includes(t.tokenKey));
                    return(
                      <div key={slot} style={{borderRadius:14,border:"2px solid "+SLOT_COLORS[si],background:"#fff",overflow:"hidden"}}>
                        <div style={{background:SLOT_COLORS[si],padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{slot}</span>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            {/* 유닛 레시피 선택 드롭다운 */}
                            {unitRecipes && unitRecipes.length>0 && (()=>{
                              const slotUnitId = form.slotUnits && form.slotUnits[slot];
                              const slotUnit = slotUnitId ? unitRecipes.find(u=>u.id===slotUnitId) : null;
                              return(
                                <select value={slotUnitId||""} onChange={e=>{
                                  const uid2 = e.target.value;
                                  setForm(f=>({...f, slotUnits:{...(f.slotUnits||{}), [slot]: uid2||null}}));
                                }}
                                  style={{fontSize:10,padding:"2px 4px",borderRadius:6,border:"1px solid #ccc",
                                    background:slotUnit?slotUnit.color+"33":"#fff",cursor:"pointer",maxWidth:90}}>
                                  <option value="">유닛 없음</option>
                                  {unitRecipes.map(u=>(
                                    <option key={u.id} value={u.id}>{u.type} {u.name}</option>
                                  ))}
                                </select>
                              );
                            })()}
                            <span style={{fontSize:11,color:allChecked?"#4a9":"#aaa",fontWeight:600}}>
                              {tokensToShow.filter(t=>form.checked.includes(t.tokenKey)).length}/{tokensToShow.length}
                            </span>
                          </div>
                        </div>
                        <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:5}}>
                          {tokensToShow.map(({tokenKey,ingName,ing})=>{
                            const chk = form.checked.includes(tokenKey);
                            const cube = cubes.find(c=>c.ingredient===ingName);
                            const g = cube&&cube.weightG>0 ? 1*cube.weightG : 0;
                            const label = tokenLabel(tokenKey, allSlotTokenObjs);
                            return(
                              <div key={tokenKey} onClick={()=>toggleCheck(tokenKey)}
                                style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",borderRadius:10,
                                  background:chk?selRec.color+"22":"#fafafa",border:"1.5px solid "+(chk?selRec.color:"#eee"),transition:"all 0.12s"}}>
                                <span style={{width:18,height:18,borderRadius:5,border:"2px solid "+(chk?selRec.color:"#ccc"),background:chk?selRec.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                  {chk&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                                </span>
                                <span style={{flex:1,fontSize:13,color:chk?"#555":"#333",textDecoration:chk?"line-through":"none",fontWeight:chk?400:500}}>{label}</span>
                                <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>🧊1개{g>0?" · "+g+"g":""}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
                {(()=>{
                  const allTokens = ingredientsToTokens(selRec.ingredients);
                  const allSlotTokens = selDish.slots.flatMap(s=>form.slots[s]||[]);
                  const unassignedTokens = allTokens.filter(t=>!allSlotTokens.includes(t.tokenKey));
                  if(unassignedTokens.length===0) return null;
                  return(
                    <div style={{borderRadius:14,border:"2px dashed #e0e0e0",background:"#fafafa",overflow:"hidden"}}>
                      <div style={{background:"#f0f0f0",padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#888"}}>기타 재료</span>
                        <span style={{fontSize:11,color:"#bbb"}}>{unassignedTokens.filter(t=>form.checked.includes(t.tokenKey)).length}/{unassignedTokens.length}</span>
                      </div>
                      <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:5}}>
                        {unassignedTokens.map(({tokenKey,ingName,ing})=>{
                          const chk = form.checked.includes(tokenKey);
                          const cube = cubes.find(c=>c.ingredient===ingName);
                          const g = cube&&cube.weightG>0 ? 1*cube.weightG : 0;
                          const allToks2 = ingredientsToTokens(selRec.ingredients);
                          const label = tokenLabel(tokenKey, allToks2);
                          return(
                            <div key={tokenKey} onClick={()=>toggleCheck(tokenKey)}
                              style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",borderRadius:10,
                                background:chk?selRec.color+"22":"#fff",border:"1.5px solid "+(chk?selRec.color:"#eee")}}>
                              <span style={{width:18,height:18,borderRadius:5,border:"2px solid "+(chk?selRec.color:"#ccc"),background:chk?selRec.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                {chk&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                              </span>
                              <span style={{flex:1,fontSize:13,color:chk?"#555":"#333",textDecoration:chk?"line-through":"none",fontWeight:chk?400:500}}>{label}</span>
                              <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>🧊1개{g>0?" · "+g+"g":""}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ingredientsToTokens(selRec.ingredients).map(({tokenKey,ingName,ing})=>{
                  const chk = form.checked.includes(tokenKey);
                  const cube = cubes.find(c=>c.ingredient===ingName);
                  const g = cube&&cube.weightG>0 ? 1*cube.weightG : 0;
                  const allToks3 = ingredientsToTokens(selRec.ingredients);
                  const label = tokenLabel(tokenKey, allToks3);
                  return(
                    <div key={tokenKey} onClick={()=>toggleCheck(tokenKey)}
                      style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",borderRadius:12,
                        background:chk?selRec.color+"22":"#f9f9f9",border:"1.5px solid "+(chk?selRec.color:"#eee"),transition:"all 0.12s"}}>
                      <span style={{width:18,height:18,borderRadius:5,border:"2px solid "+(chk?selRec.color:"#ccc"),background:chk?selRec.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {chk&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                      </span>
                      <span style={{flex:1,fontSize:13,color:chk?"#555":"#333",textDecoration:chk?"line-through":"none",fontWeight:chk?400:500}}>{label}</span>
                      <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>🧊1개{g>0?" · "+g+"g":""}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {(()=>{
              const total = ingredientsToTokens(selRec.ingredients).length;
              const done = ingredientsToTokens(selRec.ingredients).filter(t=>form.checked.includes(t.tokenKey)).length;
              if(total===0) return null;
              const pct = Math.round(done/total*100);
              return(
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa",marginBottom:4}}>
                    <span>전체 진행</span>
                    <span style={{fontWeight:600,color:done===total?"#4a9":"#aaa"}}>{done}/{total} {done===total?"🎉 완료!":""}</span>
                  </div>
                  <div style={{background:"#f0f0f0",borderRadius:10,height:6}}>
                    <div style={{width:pct+"%",height:"100%",borderRadius:10,background:done===total?"#7BC67E":selRec.color,transition:"width 0.3s"}} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        <Field label="먹은 양" value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="80ml, 반 그릇..." />
        <div style={{display:"flex",gap:8}}>
          {getEntry(target.date,target.meal) && (
            <PillBtn onClick={()=>setSchedConfirmDel(true)} color="#E78F8F" outline small>삭제</PillBtn>
          )}
          <div style={{flex:1}}>
            <PillBtn onClick={saveEntry} full disabled={!form.recipeId||(!isCustomMode&&(recipeStatus[form.recipeId]||{}).disabled)||(isCustomMode&&form.customIngredients.length===0&&(form.customUnits||[]).length===0)}>저장</PillBtn>
          </div>
        </div>
      </Overlay>
      <ConfirmDelete
        open={schedConfirmDel}
        message={target.date ? `${fmtFull(target.date)} ${target.meal} 일정을 삭제할까요?` : ""}
        onConfirm={()=>{ delEntry(); setSchedConfirmDel(false); }}
        onCancel={()=>setSchedConfirmDel(false)}
      />
    </div>
  );
}

// ────────────────────────────
// 큐브 탭
// ────────────────────────────