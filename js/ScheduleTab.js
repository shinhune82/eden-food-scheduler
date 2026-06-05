(function() {
  const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
  const MEALS = ["아침", "점심", "간식", "저녁"];
  const MEAL_ICON = { "아침": "☀️", "점심": "🌤️", "간식": "🍰", "저녁": "🌙" };
  const MEAL_BG = { "아침": "#fffae6", "점심": "#e6f7ff", "간식": "#f9f0ff", "저녁": "#f6fff5" };
  const SLOT_COLORS = ["#fff1f0", "#f5f5f5", "#e6f7ff", "#f6ffed", "#fff7e6"];

  const safeFmtMD = (dateStr) => {
    if (window.fmtMD) return window.fmtMD(dateStr);
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length >= 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : dateStr;
  };

  const safeFmtFull = (dateStr) => {
    if (window.fmtFull) return window.fmtFull(dateStr);
    return dateStr || "";
  };

  const safeTodayStr = () => {
    if (window.todayStr) return window.todayStr();
    return new Date().toISOString().slice(0, 10);
  };

  const safeGetWeekDates = (baseDate) => {
    if (window.getWeekDates) return window.getWeekDates(baseDate);
    const current = new Date(baseDate);
    const day = current.getDay();
    const distance = day === 0 ? -6 : 1 - day;
    const monday = new Date(current.setDate(current.getDate() + distance));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      dates.push(next.toISOString().slice(0, 10));
    }
    return dates;
  };

  const safeUid = () => {
    if (window.uid) return window.uid();
    return "id_" + Math.random().toString(36).substr(2, 9);
  };

  function ScheduleTab({ recipes, schedules, setSchedules, cubes, dishes, recipeStatus, vaccData, stock, unitRecipes }) {
    const [weekBase, setWeekBase] = React.useState(safeTodayStr());
    const [modal, setModal] = React.useState(false);
    const [target, setTarget] = React.useState({date:"", meal:""});
    const [form, setForm] = React.useState({recipeId:"", dishId:"", amount:"", memo:"", checked:[], slots:{}, customMode:false, customIngredients:[], customUnits:[], customSlotUnits:{}, customSlotIngredients:{}, slotUnits:{}});
    const [rdrop, setRdrop] = React.useState(false);
    const [ddrop, setDdrop] = React.useState(false);
    const [rdropSearch, setRdropSearch] = React.useState("");
    const [editSlots, setEditSlots] = React.useState(false);
    const [schedConfirmDel, setSchedConfirmDel] = React.useState(false);
    const [moveSource, setMoveSource] = React.useState(null); 
    const [dayView, setDayView] = React.useState(safeTodayStr());
    const [bannerOpen, setBannerOpen] = React.useState(false);

    const weekDates = safeGetWeekDates(weekBase);
    const today = safeTodayStr();
    const getEntry = (date, meal) => schedules.find(s => s.date === date && s.meal === meal);

    const isCustomMode = form.recipeId === "__custom__";

    const customUnitIngredients = isCustomMode
      ? ((form?.customUnits || []).flatMap(uId => {
          if (!unitRecipes) return [];
          const u = unitRecipes.find(x => x && x.id === uId);
          return u && u.ingredients ? u.ingredients : [];
        }))
      : [];

    const customRecipe = isCustomMode ? {
      id: "__custom__", name: "직접 구성", color: "#7BC67E",
      ingredients: [
        ...(form?.customIngredients || []).map(ci => ({name: ci.name, cubeCount: ci.count})),
        ...customUnitIngredients,
      ]
    } : null;

    const selRec = isCustomMode ? customRecipe : recipes.find(r => r.id === form.recipeId);
    const selDish = dishes.find(d => d.id === form.dishId);
    const disabledCount = recipeStatus ? Object.values(recipeStatus).filter(s => s?.disabled).length : 0;

    const openCell = (date, meal) => {
      const ex = getEntry(date, meal);
      const rId = ex ? (ex.recipeId || "") : "";
      const nowDisabled = rId && (recipeStatus[rId] || {}).disabled;
      setTarget({date, meal});
      const defRec = rId && !nowDisabled ? (rId === "__custom__" ? {id: "__custom__", name: "직접 구성", color: "#7BC67E", ingredients: [], unitIds: []} : recipes.find(r => r.id === rId)) : null;
      const rawSlots = ex && ex.slots && Object.keys(ex.slots).length > 0 ? ex.slots : (defRec && defRec.slotMap ? defRec.slotMap : {});
      const defDish  = ex ? (ex.dishId || "") : (defRec && defRec.dishId ? defRec.dishId : "");
      
      const defDishObj = dishes.find(d => d.id === defDish);
      const defSlots = defRec && defDishObj && window.remapSlotsToDish
        ? window.remapSlotsToDish(rawSlots, defDishObj.slots, defRec.ingredients)
        : (defRec && window.rebuildSlotMap ? window.rebuildSlotMap(rawSlots, defRec.ingredients) : rawSlots);
      const isExCustom = rId === "__custom__";
      
      setForm(ex
        ? {
            recipeId: nowDisabled ? "" : rId,
            dishId: defDish,
            amount: ex.amount || "",
            memo: ex.memo || "",
            checked: ex.checked || [],
            slots: defSlots,
            slotUnits: ex.slotUnits || {},
            customMode: isExCustom,
            customIngredients: isExCustom ? (ex.customIngredients || []) : [],
            customUnits: isExCustom ? (ex.customUnits || []) : [],
            customSlotUnits: isExCustom ? (ex.slotUnits || {}) : {},
            customSlotIngredients: isExCustom ? (ex.slots || {}) : {},
          }
        : {recipeId: "", dishId: "", amount: "", memo: "", checked: [], slots: {}, customMode: false, customIngredients: [], customUnits: [], customSlotUnits: {}, customSlotIngredients: {}, slotUnits: {}}
      );
      setRdrop(false); setDdrop(false); setEditSlots(false);
      setModal(true);
    };

    const pickRecipe = (id, recipeList) => {
      if ((recipeStatus[id] || {}).disabled) return;
      const rec = (recipeList || recipes).find(r => r.id === id);
      const cleanSlots = rec && rec.slotMap && window.rebuildSlotMap ? window.rebuildSlotMap(rec.slotMap, rec.ingredients) : {};
      setForm(f => ({...f, recipeId: id, checked: [], slots: cleanSlots, dishId: rec && rec.dishId ? rec.dishId : ""}));
      setRdrop(false);
    };

    const pickDish = id => {
      const newDish = dishes.find(d => d.id === id);
      const rec = recipes.find(r => r.id === form.recipeId);
      let newSlots = {};
      if (newDish && rec && rec.slotMap && Object.keys(rec.slotMap).length > 0 && window.remapSlotsToDish) {
        const remapped = window.remapSlotsToDish(rec.slotMap, newDish.slots, rec.ingredients);
        newDish.slots.forEach(slot => { if (remapped[slot]) newSlots[slot] = remapped[slot]; });
      }
      setForm(f => ({...f, dishId: id, slots: newSlots}));
      setDdrop(false);
    };

    const toggleCheck = name => setForm(f => ({...f, checked: f.checked.includes(name) ? f.checked.filter(x => x !== name) : [...f.checked, name]}));

    const saveEntry = () => {
      if (!form.recipeId) return;
      if (!isCustomMode && (recipeStatus[form.recipeId] || {}).disabled) return;
      const entryData = {...form};
      
      if (isCustomMode) {
        entryData.slotUnits = form.customSlotUnits || {};
        entryData.slots = form.customSlotIngredients || {};
        entryData.customIngredients = form.customIngredients || [];
        entryData.customUnits = form.customUnits || [];
      }
      setSchedules(ss => [...ss.filter(s => !(s.date === target.date && s.meal === target.meal)), {id: safeUid(), date: target.date, meal: target.meal, ...entryData}]);
      setModal(false);
    };

    const delEntry = () => { setSchedules(ss => ss.filter(s => !(s.date === target.date && s.meal === target.meal))); setModal(false); };

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
        const filtered = ss.filter(s => !(s.date === fromDate && s.meal === fromMeal) && !(s.date === toDate && s.meal === toMeal));
        return [...filtered, {...srcEntry, id: safeUid(), date: toDate, meal: toMeal}];
      });
      setMoveSource(null);
    };

    return (
      <div>
        {/* 재료 소진 알림 배너 */}
        {disabledCount > 0 && (
          <div style={{background: "#fff0f0", border: "1.5px solid #ffb3b3", borderRadius: 12, marginBottom: 14, overflow: "hidden"}}>
            <div onClick={() => setBannerOpen(v => !v)} style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", cursor: "pointer"}}>
              <span style={{fontWeight: 700, fontSize: 13, color: "#c00"}}>🚫 재료 소진 {disabledCount}개</span>
              <span style={{fontSize: 11, color: "#e55"}}>{bannerOpen ? "▲ 닫기" : "▼ 목록 보기"}</span>
            </div>
            {bannerOpen && (
              <div style={{fontSize: 11, color: "#e55", padding: "0 14px 10px", lineHeight: 1.8}}>
                {recipes.filter(r => (recipeStatus[r.id] || {}).disabled).map(r => (
                  <span key={r.id} style={{marginRight: 8, display: "inline-block"}}>{r.name} ({(recipeStatus[r.id] || {}).outOfStock.join(", ")} 없음)</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 예방접종 주간 알림 배너 */}
        {(() => {
          const birth = vaccData && vaccData.birth;
          if (!birth) return null;
          const vaccDates = window.calcVaccDates ? (window.calcVaccDates(birth) || []) : [];
          const appts = (vaccData && vaccData.appointments) || [];
          const weekAppts = vaccDates.filter(item => {
            const a = appts.find(x => x.vaccId === item.id);
            if (!a || !a.date || a.done) return false;
            return a.date >= weekDates[0] && a.date <= weekDates[6];
          });
          const dueSoon = vaccDates.filter(item => {
            const a = appts.find(x => x.vaccId === item.id);
            if (a && a.done) return false;
            return item.dateMin <= weekDates[6] && item.dateMax >= today;
          });
          if (weekAppts.length === 0 && dueSoon.length === 0) return null;
          return (
            <div style={{marginBottom: 10}}>
              {weekAppts.length > 0 && (
                <div style={{background: "#f0f6ff", border: "1.5px solid #74B5F5", borderRadius: 12, padding: "8px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"}}>
                  <span style={{fontSize: 13}}>📅</span>
                  <span style={{fontWeight: 700, fontSize: 12, color: "#48a", flex: 1}}>
                    이번 주 접종 예약: {weekAppts.map(v => {
                      const a = appts.find(x => x.vaccId === v.id);
                      return v.abbr + (v.totalDoses > 1 ? " " + v.dose + "차" : "") + " (" + safeFmtMD(a.date) + ")";
                    }).join(", ")}
                  </span>
                </div>
              )}
              {dueSoon.length > 0 && (
                <div style={{background: "#fff8f0", border: "1.5px solid #F4A261", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"}}>
                  <span style={{fontSize: 13}}>💉</span>
                  <span style={{fontWeight: 700, fontSize: 12, color: "#c85", flex: 1}}>
                    접종 시기: {dueSoon.map(v => v.abbr + (v.totalDoses > 1 ? " " + v.dose + "차" : "")).join(", ")}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* 주간 네비게이션 */}
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10}}>
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d.toISOString().slice(0, 10)); }} style={{background: "#f0f0f0", border: "none", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 18}}>&#8249;</button>
          <span style={{fontWeight: 700, color: "#333", fontSize: 14}}>{safeFmtMD(weekDates[0])} ~ {safeFmtMD(weekDates[6])}</span>
          <div style={{display: "flex", gap: 6, alignItems: "center"}}>
            <button onClick={() => { if (moveSource) setMoveSource(null); else setMoveSource("standby"); }}
              style={{background: moveSource ? "#fff3cd" : "#f0f0f0", border: "1.5px solid " + (moveSource ? "#f9a825" : "transparent"), borderRadius: 10, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: moveSource ? "#b45309" : "#888", fontWeight: moveSource ? 700 : 400}}>
              {moveSource === "standby" ? "📦 셀 선택" : moveSource ? "📦 위치 선택" : "📦 이동"}
            </button>
            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d.toISOString().slice(0, 10)); }} style={{background: "#f0f0f0", border: "none", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 18}}>&#8250;</button>
          </div>
        </div>

        {/* 주간 식단 표 */}
        <div style={{overflowX: "auto", marginBottom: 14}}>
          <div style={{minWidth: 520}}>
            <div style={{display: "grid", gridTemplateColumns: "48px repeat(7,1fr)", gap: 3, marginBottom: 4}}>
              <div/>
              {weekDates.map((d, i) => (
                <div key={d} onClick={() => setDayView(d)} style={{textAlign: "center", fontSize: 11, fontWeight: 700, color: d === today ? "#7BC67E" : i >= 5 ? "#E78F8F" : "#888", padding: "4px 0", cursor: "pointer", background: dayView === d ? "#e8f8f0" : "transparent", borderRadius: 8}}>
                  {WEEKDAYS[i]}<br/><span style={{fontSize: 13, color: d === today ? "#7BC67E" : "#555"}}>{safeFmtMD(d).includes('/') ? safeFmtMD(d) : safeFmtMD(d).slice(3)}</span>
                  {(() => {
                    if (!vaccData || !vaccData.birth || !window.calcVaccDates) return null;
                    const dayDue = (window.calcVaccDates(vaccData.birth) || []).filter(item => {
                      const a = (vaccData.appointments || []).find(x => x.vaccId === item.id);
                      return a && !a.done && a.date === d;
                    });
                    if (dayDue.length === 0) return null;
                    return <div style={{fontSize: 9, color: "#74B5F5", fontWeight: 700, marginTop: 1}}>💉{dayDue.length}</div>;
                  })()}
                </div>
              ))}
            </div>
            {MEALS.map(meal => (
              <div key={meal} style={{display: "grid", gridTemplateColumns: "48px repeat(7,1fr)", gap: 3, marginBottom: 3}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#777", background: MEAL_BG[meal], borderRadius: 10, flexDirection: "column", padding: "4px 0"}}>
                  <span style={{fontSize: 13}}>{MEAL_ICON[meal]}</span>{meal}
                </div>
                {weekDates.map(d => {
                  const ent = getEntry(d, meal);
                  const rec = ent ? (ent.recipeId === "__custom__" ? {id: "__custom__", name: "직접 구성", color: "#7BC67E", ingredients: [], unitIds: []} : recipes.find(r => r.id === ent.recipeId)) : null;
                  const dis = rec && rec.id !== "__custom__" && (recipeStatus[rec.id] || {}).disabled;
                  const vol = rec && window.cubeVolume ? window.cubeVolume(rec, cubes, unitRecipes) : 0;
                  const entSlotTokens = ent && ent.slots ? Object.values(ent.slots).flat() : [];
                  const entChecked = ent && ent.checked ? ent.checked : [];
                  const entTokens = entSlotTokens.length > 0 ? entSlotTokens : (rec && window.ingredientsToTokens ? window.ingredientsToTokens(rec.id === "__custom__" ? [] : rec.ingredients, rec.id === "__custom__" ? [] : rec.unitIds, unitRecipes).map(t => t.tokenKey) : []);
                  const checkedInTokens = entTokens.filter(tk => entChecked.includes(tk));
                  const allDone = entTokens.length > 0 && checkedInTokens.length === entTokens.length;
                  const partDone = entTokens.length > 0 && checkedInTokens.length > 0 && !allDone;
                  const isMoveSource = moveSource && moveSource !== "standby" && moveSource.date === d && moveSource.meal === meal;
                  const isStandby = moveSource === "standby";
                  const isMoveTarget = moveSource && moveSource !== "standby" && !(moveSource.date === d && moveSource.meal === meal);
                  return (
                    <div key={d}
                      onClick={() => {
                        if (moveSource === "standby") { if (rec) setMoveSource({date: d, meal: meal}); } 
                        else if (moveSource) { if (moveSource.date === d && moveSource.meal === meal) { setMoveSource(null); } else { doMove(d, meal); } } 
                        else { openCell(d, meal); }
                      }}
                      style={{minHeight: 72, borderRadius: 10, cursor: moveSource ? (rec || isMoveTarget ? "copy" : "not-allowed") : "pointer", padding: 4, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                        background: isMoveSource ? "#fff3cd" : (isStandby && rec ? "#fffde7" : (d === dayView ? (rec ? rec.color + "44" : "#e8f8f0") : (dis ? "#fff5f5" : rec ? rec.color + "22" : "#f9f9f9"))),
                        border: isMoveSource ? "2.5px dashed #f9a825" : (isStandby && rec ? "2px dashed #f9a825" : (isMoveTarget && !rec ? "2px dashed #7BC67E" : (d === dayView ? "2px solid #7BC67E" : (dis ? "1.5px solid #ffb3b3" : rec ? "1.5px solid " + rec.color + "55" : "1.5px dashed #e0e0e0")))),
                        transition: "all 0.15s"}}>
                      {isMoveSource && <div style={{fontSize: 9, color: "#b45309", fontWeight: 700, marginBottom: 2}}>📦 이동 중...</div>}
                      {rec ? (
                        <div style={{textAlign: "center", width: "100%"}}>
                          {dis && <div style={{fontSize: 9, color: "#e55", fontWeight: 700}}>🚫재료없음</div>}
                          <div style={{fontSize: 10, fontWeight: 700, color: dis ? "#c88" : "#444", lineHeight: 1.3}}>{rec.id === "__custom__" ? "✏️ 직접구성" : rec.name}</div>
                          {vol > 0 && <div style={{fontSize: 9, color: "#4a9", marginTop: 1}}>{vol}g</div>}
                          {allDone && !dis && <div style={{fontSize: 9, color: "#4a9", fontWeight: 700, marginTop: 1}}>✓완료</div>}
                          {partDone && !dis && <div style={{fontSize: 9, color: "#f90", fontWeight: 700, marginTop: 1}}>⚠부족</div>}
                        </div>
                      ) : <div style={{color: "#ccc", fontSize: 18}}>+</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 일별 식단 상세 내용 */}
        <div style={{fontWeight: 700, fontSize: 14, color: "#333", marginBottom: 8}}>{safeFmtMD(dayView)} 식단</div>
        {MEALS.map(meal => {
          const ent = getEntry(dayView, meal);
          const rec = ent ? (ent.recipeId === "__custom__" ? {id: "__custom__", name: "직접 구성", color: "#7BC67E", ingredients: [], unitIds: []} : recipes.find(r => r.id === ent.recipeId)) : null;
          const dis = rec && rec.id !== "__custom__" && (recipeStatus[rec.id] || {}).disabled;
          const dish = ent ? dishes.find(d => d.id === ent.dishId) : null;
          const isExCustom = ent && ent.recipeId === "__custom__";

          const customIngList = isExCustom
            ? [
                ...(ent.customIngredients || []).map(ci => ({name: ci.name, cubeCount: ci.count})),
                ...(ent.customUnits || []).flatMap(uId => {
                  const u = (unitRecipes || []).find(x => x.id === uId);
                  return u ? (u.ingredients || []) : [];
                })
              ]
            : null;
          const recWithIngs = rec && isExCustom ? {...rec, ingredients: customIngList || []} : rec;
          const rawSlots = ent && ent.slots && Object.values(ent.slots).flat().length > 0 ? ent.slots : (recWithIngs && recWithIngs.slotMap ? recWithIngs.slotMap : {});
          
          const currentIngredients = recWithIngs ? (recWithIngs.ingredients || []) : [];
          const currentUnitIds = recWithIngs ? (recWithIngs.unitIds || []) : [];
          const parsedTokens = window.ingredientsToTokens ? window.ingredientsToTokens(currentIngredients, currentUnitIds, unitRecipes) : [];

          const slots = recWithIngs && dish && window.remapSlotsToDish
            ? window.remapSlotsToDish(rawSlots, dish.slots, currentIngredients)
            : (recWithIngs && window.rebuildSlotMap ? window.rebuildSlotMap(rawSlots, currentIngredients) : rawSlots);
          const hasSlots = dish && dish.slots && dish.slots.length > 0;
          const allIngNames = recWithIngs ? currentIngredients.map(i => i.name) : [];
          const checked = ent && ent.checked ? ent.checked : [];
          
          const toggleDayCheck = (tokenKey) => {
            const newChecked = checked.includes(tokenKey) ? checked.filter(x => x !== tokenKey) : [...checked, tokenKey];
            setSchedules(ss => ss.map(s => s.date === dayView && s.meal === meal ? {...s, checked: newChecked} : s));
          };
          const slotTokensList = Object.values(slots).flat();
          const allTokens = slotTokensList.length > 0 ? slotTokensList : parsedTokens.map(t => t.tokenKey);
          const totalTokens = allTokens.length;
          const checkedInSlot = allTokens.filter(tk => checked.includes(tk));
          const isAllChecked = totalTokens > 0 && checkedInSlot.length === totalTokens;
          const isPartialChecked = totalTokens > 0 && checkedInSlot.length > 0 && !isAllChecked;

          return (
            <div key={meal} style={{background: ent ? (dis ? "#fff0f0" : rec ? rec.color + "18" : "#f9f9f9") : "#f9f9f9", border: "1.5px solid " + (ent ? (dis ? "#ffb3b3" : rec ? rec.color + "66" : "#e0e0e0") : "#e8e8e8"), borderRadius: 14, marginBottom: 8, overflow: "hidden"}}>
              <div style={{display: "flex", alignItems: "center", borderBottom: ent ? "1px solid " + (rec ? rec.color + "33" : "#eee") : "none"}}>
                <div onClick={() => openCell(dayView, meal)} style={{flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", cursor: "pointer"}}>
                  <span style={{fontSize: 18}}>{MEAL_ICON[meal]}</span>
                  <span style={{fontWeight: 700, fontSize: 13, color: "#555"}}>{meal}</span>
                  {ent && rec && <span style={{fontWeight: 700, fontSize: 14, color: dis ? "#e55" : rec.color}}>{dis && "🚫 "}{rec.name}</span>}
                  {!ent && <span style={{fontSize: 12, color: "#bbb"}}>+ 추가</span>}
                  {dish && <span style={{fontSize: 11, color: "#777"}}>{dish.icon} {dish.name}</span>}
                  {ent && rec && isAllChecked && <span style={{marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#4a9", background: "#e8f8f0", borderRadius: 20, padding: "2px 8px"}}>✓ 완료</span>}
                  {ent && rec && isPartialChecked && <span style={{marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#f90", background: "#fff8e1", borderRadius: 20, padding: "2px 8px"}}>⚠ 부족</span>}
                </div>
              </div>
              {ent && ent.memo && (
                <div style={{fontSize: 12, color: "#666", padding: "6px 14px", background: "#fffde7", borderBottom: "1px solid #fff3cd", display: "flex", alignItems: "center", gap: 6}}>
                  <span>📝</span><span>{ent.memo}</span>
                </div>
              )}
              {ent && rec && (
                <div style={{padding: "10px 16px"}}>
                  {isExCustom && (
                    <div>
                      {/* 💡 [수정] 직접구성 시 세트(유닛) 배지가 식판 내부 슬롯 단위로 들어가도록 하단 식판 루프 내부로 병합 및 상단 부유구문 제거 */}
                      {hasSlots && Object.values(slots).flat().length > 0 && dish.slots.map((slot, si) => {
                        const slotTokens = (slots[slot] || []);
                        const tokensToShow = slotTokens.map(tk => ({tokenKey: tk, ingName: tk.split("__g")[0]})).filter(Boolean);
                        
                        // 현재 슬롯에 맵핑 배정된 유닛 정보 확인
                        const assignedUnitId = ent.slotUnits && ent.slotUnits[slot];
                        const assignedUnit = assignedUnitId && unitRecipes ? unitRecipes.find(u => u.id === assignedUnitId) : null;

                        if (tokensToShow.length === 0 && !assignedUnit) return null;
                        
                        const obj2 = Object.values(slots).flat().map(tk => ({tokenKey: tk, ingName: tk.split("__g")[0]}));
                        const allChk2 = tokensToShow.length > 0 ? tokensToShow.every(t => checked.includes(t.tokenKey)) : true;
                        
                        return (
                          <div key={slot} style={{marginBottom: 8, borderRadius: 12, border: "1.5px solid " + (allChk2 ? "#7BC67E" : "#e0e0e0"), overflow: "hidden"}}>
                            <div style={{background: allChk2 ? "#e8f8f0" : "#f5f5f5", padding: "5px 12px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                              <span style={{fontSize: 11, fontWeight: 700, color: "#555"}}>📌 {slot}</span>
                              <div style={{display: "flex", alignItems: "center", gap: 6}}>
                                {assignedUnit && (
                                  <span style={{background: assignedUnit.color + "22", color: assignedUnit.color, border: "1px solid " + assignedUnit.color + "55", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700}}>
                                    🍱 {assignedUnit.name}
                                  </span>
                                )}
                                {tokensToShow.length > 0 && (
                                  <span style={{fontSize: 11, color: allChk2 ? "#4a9" : "#aaa", fontWeight: 600}}>{tokensToShow.filter(t => checked.includes(t.tokenKey)).length}/{tokensToShow.length}</span>
                                )}
                              </div>
                            </div>
                            {tokensToShow.length > 0 && (
                              <div style={{padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6}}>
                                {tokensToShow.map(({tokenKey, ingName}) => (
                                  <label key={tokenKey} onClick={e => e.stopPropagation()} style={{display: "flex", alignItems: "center", gap: 4, background: checked.includes(tokenKey) ? "#e8f8f0" : "#fff", border: "1px solid " + (checked.includes(tokenKey) ? "#7BC67E" : "#ddd"), borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 12}}>
                                    <input type="checkbox" checked={checked.includes(tokenKey)} onChange={() => toggleDayCheck(tokenKey)} style={{cursor: "pointer", accentColor: "#7BC67E"}}/>
                                    {window.tokenLabel ? window.tokenLabel(tokenKey, obj2) : ingName}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* 식판 슬롯 매핑 정보가 없을 때의 예외 처리 구문 */}
                      {!(hasSlots && Object.values(slots).flat().length > 0) && (
                        <div>
                          {(ent.customUnits || []).length > 0 && (
                            <div style={{marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 6}}>
                              {(ent.customUnits || []).map((uId, uidx) => {
                                const u = (unitRecipes || []).find(x => x.id === uId);
                                if (!u) return null;
                                return <span key={uidx} style={{background: u.color + "22", border: "1.5px solid " + u.color + "88", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600}}>🍱 {u.name}</span>;
                              })}
                            </div>
                          )}
                          {(ent.customIngredients || []).length > 0 && window.ingredientsToTokens && (
                            <div>
                              <div style={{fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6}}>재료 체크</div>
                              <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                                {window.ingredientsToTokens((ent.customIngredients || []).map(ci => ({name: ci.name, cubeCount: ci.count}))).map(({tokenKey, ingName}) => (
                                  <label key={tokenKey} onClick={e => e.stopPropagation()} style={{display: "flex", alignItems: "center", gap: 4, background: checked.includes(tokenKey) ? "#e8f8f0" : "#f5f5f5", border: "1px solid " + (checked.includes(tokenKey) ? "#7BC67E" : "#ddd"), borderRadius: 20, padding: "3px 10px", cursor: "pointer", fontSize: 12}}>
                                    <input type="checkbox" checked={checked.includes(tokenKey)} onChange={() => toggleDayCheck(tokenKey)} style={{cursor: "pointer", accentColor: "#7BC67E"}}/>
                                    {ingName}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!isExCustom && rec.id !== "__custom__" && (
                    <div>
                      {hasSlots && Object.values(slots).flat().length > 0 && dish.slots.map((slot, si) => {
                        const slotTokens = (slots[slot] || []);
                        // 저장된 슬롯 토큰은 검증 없이 표시 (필터 조건으로 슬롯이 사라지는 버그 수정)
                        const tokensToShow = slotTokens.map(tk => ({
                          tokenKey: tk,
                          ingName: tk.split("__g")[0]
                        }));
                      
                        const assignedUnitId = ent.slotUnits && ent.slotUnits[slot];
                        const assignedUnit = assignedUnitId && unitRecipes ? unitRecipes.find(u => u.id === assignedUnitId) : null;
                      
                        if (tokensToShow.length === 0 && !assignedUnit) return null;
                        const allChk = tokensToShow.every(t => checked.includes(t.tokenKey));
                        return (
                          <div key={slot} style={{marginBottom: 8, borderRadius: 12, border: "1.5px solid " + (allChk ? "#7BC67E" : "#e0e0e0"), overflow: "hidden"}}>
                            <div style={{background: allChk ? "#e8f8f0" : "#f5f5f5", padding: "5px 12px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                              <span style={{fontSize: 11, fontWeight: 700, color: "#555"}}>📌 {slot}</span>
                              {assignedUnit && (
                                <span style={{fontSize: 10, background: assignedUnit.color + "33", borderRadius: 10, padding: "1px 6px", color: assignedUnit.color, fontWeight: 600}}>
                                  🍱 {assignedUnit.name}
                                </span>
                              )}
                              <span style={{fontSize: 11, color: allChk ? "#4a9" : "#aaa", fontWeight: 600}}>{tokensToShow.filter(t => checked.includes(t.tokenKey)).length}/{tokensToShow.length}</span>
                            </div>
                            <div style={{padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6}}>
                              {tokensToShow.map(({tokenKey, ingName}) => (
                                <label key={tokenKey} onClick={e => e.stopPropagation()} style={{display: "flex", alignItems: "center", gap: 4, background: checked.includes(tokenKey) ? "#e8f8f0" : "#fff", border: "1px solid " + (checked.includes(tokenKey) ? "#7BC67E" : "#ddd"), borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 12}}>
                                  <input type="checkbox" checked={checked.includes(tokenKey)} onChange={() => toggleDayCheck(tokenKey)} style={{cursor: "pointer", accentColor: "#7BC67E"}}/>
                                  {window.tokenLabel ? window.tokenLabel(tokenKey, parsedTokens) : ingName}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {!(hasSlots && Object.values(slots).flat().length > 0) && allIngNames.length > 0 && window.ingredientsToTokens && (
                        <div>
                          <div style={{fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6}}>재료 체크</div>
                          <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                            {window.ingredientsToTokens(currentIngredients, currentUnitIds, unitRecipes).map(({tokenKey, ingName}) => {
                              const lbl = window.tokenLabel ? window.tokenLabel(tokenKey, window.ingredientsToTokens(currentIngredients, currentUnitIds, unitRecipes)) : ingName;
                              return (
                                <label key={tokenKey} onClick={e => e.stopPropagation()} style={{display: "flex", alignItems: "center", gap: 4, background: checked.includes(tokenKey) ? "#e8f8f0" : "#f5f5f5", border: "1px solid " + (checked.includes(tokenKey) ? "#7BC67E" : "#ddd"), borderRadius: 20, padding: "3px 10px", cursor: "pointer", fontSize: 12}}>
                                  <input type="checkbox" checked={checked.includes(tokenKey)} onChange={() => toggleDayCheck(tokenKey)} style={{cursor: "pointer", accentColor: "#7BC67E"}}/>
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
            </div>
          );
        })}

        {/* 일정 추가 / 상세 모달 */}
        <window.Overlay open={modal} onClose={() => setModal(false)} wide title={target.date ? safeFmtFull(target.date) + " " + MEAL_ICON[target.meal] + " " + target.meal : ""}>
          <div style={{marginBottom: 12, position: "relative"}}>
            <div style={{fontSize: 12, color: "#888", marginBottom: 5}}>레시피 선택</div>
            <div onClick={() => { setRdrop(o => { if (!o) setRdropSearch(""); return !o; }); setDdrop(false); }} style={{padding: "10px 14px", border: "1.5px solid #e8e8e8", borderRadius: 12, cursor: "pointer", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              {selRec ? (
                <span style={{display: "flex", alignItems: "center", gap: 8}}>
                  <span style={{width: 10, height: 10, borderRadius: "50%", background: selRec.color, display: "inline-block"}} />
                  <span style={{fontWeight: 600, fontSize: 14, color: "#333"}}>{selRec.name}</span>
                </span>
              ) : <span style={{color: "#bbb", fontSize: 14}}>레시피를 선택하세요</span>}
              <span style={{color: "#aaa"}}>{rdrop ? "▲" : "▼"}</span>
            </div>
            {rdrop && (
              <div style={{position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden", marginTop: 4}}>
                <div style={{padding: "8px 10px", borderBottom: "1px solid #f0f0f0"}}>
                  <input autoFocus value={rdropSearch} onChange={e => setRdropSearch(e.target.value)} placeholder="레시피 검색..." onClick={e => e.stopPropagation()} style={{width: "100%", padding: "6px 10px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box"}}/>
                </div>
                {(() => {
                  const filtered = [...recipes].filter(r => r.name.includes(rdropSearch));
                  const favs = filtered.filter(r => r.favorite).sort((a, b) => a.name.localeCompare(b.name, "ko"));
                  const others = filtered.filter(r => !r.favorite).sort((a, b) => a.name.localeCompare(b.name, "ko"));
                  const showFav = !rdropSearch && favs.length > 0;
                  const list = rdropSearch ? filtered.sort((a, b) => a.name.localeCompare(b.name, "ko")) : [...favs, ...others];
                  return (
                    <>
                      {!rdropSearch && (
                        <div onClick={e => { e.stopPropagation(); setForm(f => ({...f, recipeId: "__custom__", customMode: true, customIngredients: [], checked: [], slots: {}, dishId: ""})); setRdrop(false); }} style={{padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: form.recipeId === "__custom__" ? "#e8f8f0" : "#f9fff9", borderBottom: "2px solid #7BC67E"}}>
                          <span style={{fontSize: 18}}>✏️</span>
                          <span style={{flex: 1}}>
                            <span style={{fontWeight: 700, fontSize: 14, color: "#4a9"}}>직접 구성하기</span>
                            <span style={{display: "block", fontSize: 11, color: "#7a9", marginTop: 1}}>재고 있는 큐브로 오늘 메뉴 직접 선택</span>
                          </span>
                        </div>
                      )}
                      {showFav && <div style={{padding: "4px 14px", fontSize: 10, fontWeight: 700, color: "#f9a825", background: "#fffde7", borderBottom: "1px solid #fff9c4"}}>⭐ 즐겨찾기</div>}
                      {list.map((r, ri) => {
                        const st = recipeStatus[r.id] || {disabled: false, outOfStock: []};
                        return (
                          <div key={r.id} onClick={() => pickRecipe(r.id, list)} style={{padding: "10px 14px", cursor: st.disabled ? "not-allowed" : "pointer", background: form.recipeId === r.id ? "#f0fcf4" : st.disabled ? "#fcfcfc" : "#fff", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifycontent: "space-between", opacity: st.disabled ? 0.5 : 1}}>
                            <span style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: st.disabled ? "#aaa" : "#333", fontWeight: form.recipeId === r.id ? 700 : 400}}>
                              <span style={{width: 8, height: 8, borderRadius: "50%", background: r.color}}/>
                              {r.name} {r.favorite && "⭐"}
                            </span>
                            {st.disabled && <span style={{fontSize: 10, color: "#e55", fontWeight: 700}}>🚫 {st.outOfStock[0]} 없음</span>}
                          </div>
                        );
                      })}
                      {list.length === 0 && <div style={{padding: "16px", textAlign: "center", color: "#bbb", fontSize: 13}}>검색 결과가 없습니다.</div>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 직접 구성(CustomMode) UI */}
          {isCustomMode && (
            <div style={{background: "#f4fbf6", border: "1.5px dashed #7BC67E", borderRadius: 12, padding: 12, marginBottom: 12}}>
              <div style={{fontWeight: 700, fontSize: 12, color: "#4a9", marginBottom: 8}}>🧺 직접 재료/유닛 담기</div>
              
              {/* 유닛 레시피 담기 영역 */}
              {unitRecipes && unitRecipes.length > 0 && (
                <div style={{marginBottom: 10}}>
                  <div style={{fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4}}>세트(유닛) 추가</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                    {unitRecipes.map(ur => {
                      const hasUnit = (form.customUnits || []).includes(ur.id);
                      return (
                        <button key={ur.id} onClick={() => {
                          setForm(f => {
                            const exist = (f.customUnits || []).includes(ur.id);
                            const nextUnits = exist ? f.customUnits.filter(id => id !== ur.id) : [...(f.customUnits || []), ur.id];
                            return {...f, customUnits: nextUnits};
                          });
                        }} style={{background: hasUnit ? ur.color : "#fff", border: "1px solid " + ur.color, color: hasUnit ? "#fff" : ur.color, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer"}}>
                          {hasUnit ? "✓ " + ur.name : "+ " + ur.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 개별 큐브 재료 추가 영역 */}
              <div>
                <div style={{fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4}}>개별 큐브 추가</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto", padding: 2, background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0"}}>
                  {cubes && cubes.map(c => {
                    const current = (form.customIngredients || []).find(ci => ci.name === c.name);
                    const count = current ? current.count : 0;
                    const inStock = stock && stock[c.name] ? stock[c.name] : 0;
                    return (
                      <div key={c.name} style={{display: "flex", alignItems: "center", gap: 4, background: "#f5f5f5", borderRadius: 20, padding: "2px 8px", fontSize: 11}}>
                        <span style={{fontWeight: 500, color: inStock <= 0 ? "#aaa" : "#333"}}>{c.name}({inStock})</span>
                        {count > 0 && (
                          <button onClick={() => {
                            setForm(f => {
                              const next = f.customIngredients.map(ci => ci.name === c.name ? {...ci, count: ci.count - 1} : ci).filter(ci => ci.count > 0);
                              return {...f, customIngredients: next};
                            });
                          }} style={{border: "none", background: "#e0e0e0", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center"}}>-</button>
                        )}
                        {count > 0 && <span style={{fontWeight: 700, color: "#4a9"}}>{count}</span>}
                        <button onClick={() => {
                          if (count >= inStock) return;
                          setForm(f => {
                            const exist = f.customIngredients.some(ci => ci.name === c.name);
                            const next = exist 
                              ? f.customIngredients.map(ci => ci.name === c.name ? {...ci, count: ci.count + 1} : ci)
                              : [...f.customIngredients, {name: c.name, count: 1}];
                            return {...f, customIngredients: next};
                          });
                        }} disabled={inStock <= 0} style={{border: "none", background: count >= inStock ? "#ccc" : "#7BC67E", color: "#fff", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center"}}>+</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 식기(식판) 선택 구역 */}
          {selRec && (
            <div style={{marginBottom: 12, position: "relative"}}>
              <div style={{fontSize: 12, color: "#888", marginBottom: 5}}>식기(식판) 매핑</div>
              <div onClick={() => { setDdrop(o => !o); setRdrop(false); }} style={{padding: "10px 14px", border: "1.5px solid #e8e8e8", borderRadius: 12, cursor: "pointer", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                {selDish ? (
                  <span style={{fontSize: 14, fontWeight: 600, color: "#333"}}>{selDish.icon} {selDish.name}</span>
                ) : <span style={{color: "#bbb", fontSize: 14}}>일반 그릇 (슬롯 매핑 없음)</span>}
                <span style={{color: "#aaa"}}>{ddrop ? "▲" : "▼"}</span>
              </div>
              {ddrop && (
                <div style={{position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden", marginTop: 4, maxHeight: 200, overflowY: "auto"}}>
                  <div onClick={() => { pickDish(""); setForm(f => ({...f, slots: {}, customSlotIngredients: {}, customSlotUnits: {}, slotUnits: {}})); }} style={{padding: "10px 14px", cursor: "pointer", background: "#fff", borderBottom: "1px solid #f5f5f5", fontSize: 13, color: "#999"}}>
                    ❌ 매핑 해제 (그릇 없음)
                  </div>
                  {dishes.map(d => (
                    <div key={d.id} onClick={() => pickDish(d.id)} style={{padding: "10px 14px", cursor: "pointer", background: form.dishId === d.id ? "#f0fcf4" : "#fff", borderBottom: "1px solid #f5f5f5", fontSize: 13, fontWeight: form.dishId === d.id ? 700 : 400, color: "#333"}}>
                      {d.icon} {d.name} <span style={{fontSize: 11, color: "#aaa", fontWeight: 400}}>({d.slots.join(", ")})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 식판 슬롯 매핑 편집 UI */}
          {selRec && selDish && selDish.slots && (
            <div style={{background: "#f9f9f9", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #eee"}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8}}>
                <span style={{fontWeight: 700, fontSize: 12, color: "#555"}}>📍 슬롯별 재료 배치</span>
                <button onClick={() => setEditSlots(v => !v)} style={{background: "none", border: "none", color: "#48a", fontSize: 12, cursor: "pointer", fontWeight: 600}}>
                  {editSlots ? "완료" : "⚙️ 배치 편집"}
                </button>
              </div>

              {selDish.slots.map(slot => {
                const currentSlots = isCustomMode ? (form.customSlotIngredients || {}) : (form.slots || {});
                const currentSlotUnits = isCustomMode ? (form.customSlotUnits || {}) : (form.slotUnits || {});
                
                const slotTk = currentSlots[slot] || [];
                const assignedUnitId = currentSlotUnits[slot];
                const assignedUnit = assignedUnitId && unitRecipes ? unitRecipes.find(u => u.id === assignedUnitId) : null;

                const builtTokens = window.ingredientsToTokens ? window.ingredientsToTokens(selRec.ingredients || [], isCustomMode ? [] : (selRec.unitIds || []), unitRecipes) : [];

                if (editSlots) {
                  return (
                    <div key={slot} style={{marginBottom: 8, background: "#fff", padding: 8, borderRadius: 8, border: "1.5px solid #e0e0e0"}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: "#444", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <span>📌 {slot}</span>
                        {assignedUnit && <span style={{background: assignedUnit.color + "22", color: assignedUnit.color, fontSize: 10, padding: "1px 6px", borderRadius: 6}}>{assignedUnit.name}</span>}
                      </div>
                      
                      {/* 유닛 레시피 배치 */}
                      {(() => {
                        const unitIds = isCustomMode 
                          ? (form.customUnits || []) 
                          : (selRec && selRec.unitIds ? selRec.unitIds : []);
                        if (unitIds.length === 0) return null;
                        return (
                          <div style={{marginBottom: 6, borderBottom: "1px dashed #eee", paddingBottom: 4}}>
                            <div style={{fontSize: 10, color: "#888", marginBottom: 2}}>유닛(세트) 배치:</div>
                            <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                              {unitIds.map(uId => {
                                const u = (unitRecipes || []).find(x => x.id === uId);
                                if (!u) return null;
                                const slotUnitsField = isCustomMode ? 'customSlotUnits' : 'slotUnits';
                                const currentSU = form[slotUnitsField] || {};
                                const isAssigned = currentSU[slot] === uId;
                                return (
                                  <button key={uId} onClick={() => {
                                    setForm(f => {
                                      const nextSU = {...(f[slotUnitsField] || {})};
                                      if (isAssigned) delete nextSU[slot];
                                      else nextSU[slot] = uId;
                                      return {...f, [slotUnitsField]: nextSU};
                                    });
                                  }} style={{background: isAssigned ? u.color : "#fff", border: "1px solid " + u.color, color: isAssigned ? "#fff" : u.color, borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer"}}>
                                    {u.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 토큰(큐브) 선택 */}
                      <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                        {builtTokens.map(tk => {
                          const active = slotTk.includes(tk.tokenKey);
                          return (
                            <button key={tk.tokenKey} onClick={() => {
                              setForm(f => {
                                const targetField = isCustomMode ? 'customSlotIngredients' : 'slots';
                                const prevMap = f[targetField] || {};
                                let oldArr = prevMap[slot] || [];
                                let nextArr = oldArr.includes(tk.tokenKey) ? oldArr.filter(x => x !== tk.tokenKey) : [...oldArr, tk.tokenKey];
                                
                                const nextMap = {...prevMap};
                                Object.keys(nextMap).forEach(k => {
                                  if (nextMap[k]) nextMap[k] = nextMap[k].filter(x => x !== tk.tokenKey);
                                });
                                nextMap[slot] = nextArr;
                                return {...f, [targetField]: nextMap};
                              });
                            }} style={{background: active ? "#7BC67E" : "#f5f5f5", color: active ? "#fff" : "#555", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer"}}>
                              {window.tokenLabel ? window.tokenLabel(tk.tokenKey, builtTokens) : tk.ingName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                const validTokens = slotTk.map(tKey => builtTokens.find(bt => bt.tokenKey === tKey)).filter(Boolean);
                if (validTokens.length === 0 && !assignedUnit) return null;
                return (
                  <div key={slot} style={{fontSize: 11, color: "#444", background: "#fff", padding: "4px 8px", borderRadius: 6, marginBottom: 4, display: "flex", alignItems: "center", gap: 6}}>
                    <span style={{fontWeight: 700, color: "#666"}}>• {slot}:</span>
                    {assignedUnit && <span style={{fontWeight: 600, color: assignedUnit.color}}>[🍱 {assignedUnit.name}]</span>}
                    <span>{validTokens.map(vt => window.tokenLabel ? window.tokenLabel(vt.tokenKey, builtTokens) : vt.ingName).join(", ")}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 하단 입력 폼 및 저장 버튼 */}
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10}}>
            <div>
              <div style={{fontSize: 12, color: "#888", marginBottom: 4}}>섭취량 (정량 분량)</div>
              <input value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="예: 120ml, 2/3 완식" style={{width: "100%", padding: "10px", border: "1.5px solid #e8e8e8", borderRadius: 12, fontSize: 13, outline: "none", boxSizing: "border-box"}}/>
            </div>
            <div>
              <div style={{fontSize: 12, color: "#888", marginBottom: 4}}>메모 / 특이사항</div>
              <input value={form.memo} onChange={e => setForm(f => ({...f, memo: e.target.value}))} placeholder="예: 알레르기 주의, 흘림 많음" style={{width: "100%", padding: "10px", border: "1.5px solid #e8e8e8", borderRadius: 12, fontSize: 13, outline: "none", boxSizing: "border-box"}}/>
            </div>
          </div>

          <div style={{display: "flex", gap: 8, marginTop: 16}}>
            {schedules.some(s => s.date === target.date && s.meal === target.meal) && (
              <button onClick={() => {
                if (schedConfirmDel) { delEntry(); setSchedConfirmDel(false); }
                else { setSchedConfirmDel(true); }
              }} style={{background: schedConfirmDel ? "#d32f2f" : "#fff", color: schedConfirmDel ? "#fff" : "#e53935", border: "1.5px solid #e53935", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"}}>
                {schedConfirmDel ? "💥 정말 삭제" : "🗑️ 삭제"}
              </button>
            )}
            <button onClick={saveEntry} disabled={!form.recipeId} style={{flex: 1, background: form.recipeId ? "#7BC67E" : "#ccc", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: form.recipeId ? "pointer" : "not-allowed"}}>
              💾 식단 저장하기
            </button>
          </div>
        </window.Overlay>
      </div>
    );
  }

  window.ScheduleTab = ScheduleTab;
})();
