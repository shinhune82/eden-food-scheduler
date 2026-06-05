
const { useState, useEffect, useCallback } = React;

function ingredientsToTokens(ingredients) {
  let gi = 0;
  return ingredients.flatMap(ing =>
    Array.from({length: Number(ing.cubeCount)||0}, () => {
      const tokenKey = ing.name + "__g" + gi++;
      return { tokenKey, ingName: ing.name, ing };
    })
  );
}

function rebuildSlotMap(slotMap, ingredients) {
  let gi = 0;
  const newTokens = {};
  for (const ing of ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const count = Number(ing.cubeCount) || 1;
    newTokens[name] = [];
    for (let i = 0; i < count; i++) {
      newTokens[name].push(name + "__g" + gi++);
    }
  }
  const ingUsed = {};
  const result = {};
  for (const [slot, tokenKeys] of Object.entries(slotMap||{})) {
    result[slot] = [];
    for (const tk of tokenKeys) {
      const ingName = tk.split("__g")[0];
      if (!ingUsed[ingName]) ingUsed[ingName] = 0;
      const idx = ingUsed[ingName];
      if (newTokens[ingName] && idx < newTokens[ingName].length) {
        result[slot].push(newTokens[ingName][idx]);
        ingUsed[ingName]++;
      }
    }
  }
  return result;
}

// ★ 버그 수정: dish 슬롯 이름이 바뀐 경우(예: "냄비용"→"냄비") 저장된 슬롯 키를 현재 dish 슬롯에 재매핑
function remapSlotsToDish(slots, dishSlots, ingredients) {
  // 1단계: tokenKey 재생성
  const rebuilt = rebuildSlotMap(slots, ingredients);
  // 2단계: 현재 dish 슬롯 이름과 이미 일치하면 그대로 반환
  const hasMatch = dishSlots.some(s => rebuilt[s] && rebuilt[s].length > 0);
  if (hasMatch) return rebuilt;
  // 3단계: 키 이름 불일치 → 저장 순서 기준으로 dish 슬롯에 재배분
  // (예: {냄비용:[...], 밥:[...]} → dish슬롯[냄비,밥,...] 에 순서대로 매핑)
  const savedKeys = Object.keys(slots);
  const result = {};
  savedKeys.forEach((savedKey, i) => {
    const dishSlot = dishSlots[i];
    if (dishSlot && slots[savedKey] && slots[savedKey].length > 0) {
      const remapped = rebuildSlotMap({[savedKey]: slots[savedKey]}, ingredients);
      result[dishSlot] = remapped[savedKey] || [];
    }
  });
  return result;
}

// 삭제 확인 다이얼로그
function ConfirmDelete({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:320,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:12}}>🗑️</div>
        <div style={{fontSize:15,fontWeight:700,color:"#333",textAlign:"center",marginBottom:8}}>삭제하시겠어요?</div>
        <div style={{fontSize:13,color:"#888",textAlign:"center",marginBottom:20,lineHeight:1.6}}>{message}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"11px",border:"1.5px solid #e0e0e0",borderRadius:12,background:"#f5f5f5",cursor:"pointer",fontSize:14,fontWeight:600,color:"#666"}}>취소</button>
          <button onClick={onConfirm} style={{flex:1,padding:"11px",border:"none",borderRadius:12,background:"#E78F8F",cursor:"pointer",fontSize:14,fontWeight:700,color:"#fff"}}>삭제</button>
        </div>
      </div>
    </div>
  );
}

function tokenLabel(tokenKey, allTokens) {
  const ingName = tokenKey.split("__g")[0];
  const sameGroup = allTokens.filter(t => t.ingName === ingName);
  if (sameGroup.length <= 1) return ingName;
  const pos = sameGroup.findIndex(t => t.tokenKey === tokenKey) + 1;
  return ingName + " (" + pos + "/" + sameGroup.length + ")";
}

const RECIPE_COLORS = ["#FFB347","#7BC67E","#F4A261","#74B5F5","#E78F8F","#B5A4F5","#F5D07A","#7ADAD5"];
const CAT_COLORS = ["#FFE0A3","#C8F0C0","#F4C8C8","#FFD6E8","#E8E8E8","#C8E8FF","#E8D4F8","#FFECC8"];

const INIT_CATEGORIES = [
  {id:"cat1",name:"곡류",color:"#FFE0A3"},
  {id:"cat2",name:"채소",color:"#C8F0C0"},
  {id:"cat3",name:"단백질",color:"#F4C8C8"},
  {id:"cat4",name:"과일",color:"#FFD6E8"},
  {id:"cat5",name:"기타",color:"#E8E8E8"},
];
const INIT_DISHES = [
  {id:"d1",name:"타원형 식판",icon:"🍽️",slots:["밥","국","반찬"]},
  {id:"d2",name:"사각형 식판",icon:"⬜",slots:["밥","국","반찬"]},
  {id:"d3",name:"이유식 포트",icon:"🥣",slots:["이유식"]},
];
const INIT_RECIPES = [
  {id:"r1",name:"단호박 죽",color:"#FFB347",note:"달콤하고 부드러움",ingredients:[{name:"단호박",cubeCount:2},{name:"쌀",cubeCount:1}]},
  {id:"r2",name:"브로콜리 감자 죽",color:"#7BC67E",note:"철분 보충",ingredients:[{name:"브로콜리",cubeCount:1},{name:"감자",cubeCount:1},{name:"쌀",cubeCount:1}]},
  {id:"r3",name:"닭고기 채소 죽",color:"#F4A261",note:"단백질 풍부",ingredients:[{name:"닭고기",cubeCount:1},{name:"당근",cubeCount:1},{name:"애호박",cubeCount:1},{name:"쌀",cubeCount:1}]},
];
const INIT_CUBES = [
  {id:"c1",ingredient:"단호박",count:0,madeDate:"2026-02-20",weightG:15,categoryId:"cat2"},
  {id:"c2",ingredient:"브로콜리",count:8,madeDate:"2026-02-22",weightG:12,categoryId:"cat2"},
  {id:"c3",ingredient:"감자",count:3,madeDate:"2026-02-22",weightG:15,categoryId:"cat2"},
  {id:"c4",ingredient:"닭고기",count:6,madeDate:"2026-02-25",weightG:10,categoryId:"cat3"},
  {id:"c5",ingredient:"당근",count:10,madeDate:"2026-02-25",weightG:12,categoryId:"cat2"},
  {id:"c6",ingredient:"애호박",count:4,madeDate:"2026-02-25",weightG:12,categoryId:"cat2"},
  {id:"c7",ingredient:"쌀",count:20,madeDate:"2026-02-20",weightG:20,categoryId:"cat1"},
];

function cubeVolume(recipe, cubes, unitRecipes) {
  const ingVol = (recipe.ingredients||[]).reduce((sum, ing) => {
    const c = cubes.find(x => x.ingredient === ing.name);
    return sum + (Number(ing.cubeCount)||0) * (c ? Number(c.weightG)||0 : 0);
  }, 0);
  const unitVol = (recipe.unitIds||[]).reduce((sum, uId) => {
    const u = (unitRecipes||[]).find(x=>x.id===uId);
    if(!u) return sum;
    return sum + u.ingredients.reduce((s,ing)=>{
      const c = cubes.find(x=>x.ingredient===ing.name);
      return s + (Number(ing.cubeCount)||0)*(c?Number(c.weightG)||0:0);
    }, 0);
  }, 0);
  return ingVol + unitVol;
}

function calcStock(cubes, schedules, recipes) {
  const used = {};
  schedules.forEach(s => {
    const rec = recipes.find(r => r.id === s.recipeId);
    if (rec) {
      rec.ingredients.forEach(ing => { used[ing.name] = (used[ing.name]||0) + (Number(ing.cubeCount)||0); });
      (rec.unitIds||[]).forEach(uId => {
        const u = (window._unitRecipes||[]).find(x=>x.id===uId);
        if(u) u.ingredients.forEach(ing => { used[ing.name] = (used[ing.name]||0) + (Number(ing.cubeCount)||0); });
      });
    }
  });
  const stock = {};
  cubes.forEach(c => { stock[c.ingredient] = Math.max(0, c.count - (used[c.ingredient]||0)); });
  const status = {};
  recipes.forEach(r => {
    const oos = r.ingredients.filter(ing => {
      const cube = cubes.find(c => c.ingredient === ing.name);
      if (!cube) return false;
      const needed = Number(ing.cubeCount) || 0;
      const avail = stock[ing.name] ?? 0;
      return avail < needed;
    });
    status[r.id] = { disabled: oos.length > 0, outOfStock: oos.map(i=>i.name) };
  });
  return { stock, status };
}

function getWeekDates(base) {
  const d = new Date(base), dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow===0 ? 6 : dow-1));
  return Array.from({length:7}, (_,i) => {
    const dd = new Date(mon); dd.setDate(mon.getDate()+i);
    return dd.toISOString().slice(0,10);
  });
}

function Overlay({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.33)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:wide?580:460,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:700,fontSize:16,color:"#333"}}>{title}</span>
          <button onClick={onClose} style={{background:"#f0f0f0",border:"none",borderRadius:50,width:30,height:30,cursor:"pointer",fontSize:15,lineHeight:"30px",textAlign:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type }) {
  return(
    <div style={{marginBottom:12}}>
      {label && <div style={{fontSize:12,color:"#888",marginBottom:4}}>{label}</div>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} type={type||"text"}
        style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e8e8e8",borderRadius:12,fontSize:14,outline:"none",boxSizing:"border-box",background:"#fafafa"}} />
    </div>
  );
}

function PillBtn({ children, onClick, color, small, outline, full, disabled }) {
  const bg = color || "#7BC67E";
  return(
    <button onClick={onClick} disabled={!!disabled}
      style={{background:outline?"transparent":bg,color:outline?bg:"#fff",border:"2px solid "+bg,borderRadius:12,
        padding:small?"6px 14px":"10px 20px",fontWeight:600,fontSize:small?12:14,
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,width:full?"100%":undefined}}>
      {children}
    </button>
  );
}

function SortBar({ options, value, onChange }) {
  return(
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
      {options.map(([val,label]) => (
        <button key={val} onClick={()=>onChange(val)}
          style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:value===val?700:400,
            border:"1.5px solid "+(value===val?"#7BC67E":"#e0e0e0"),
            background:value===val?"#7BC67E22":"#fff",color:value===val?"#4a9":"#888"}}>
          {label}
        </button>
      ))}
    </div>
  );
}

function IngSearch({ value, onChange, cubes }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value||"");
  const [hov, setHov] = useState(null);
  const allIngs = Array.from(new Set(cubes.map(c=>c.ingredient))).sort((a,b)=>a.localeCompare(b,"ko"));
  const filtered = q.trim() === "" ? allIngs : allIngs.filter(n=>n.includes(q));
  useEffect(() => { setQ(value||""); }, [value]);
  return(
    <div style={{position:"relative",flex:2}}>
      <input value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(()=>setOpen(false), 150)}
        placeholder="재료 검색..."
        style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,outline:"none",background:"#fafafa",boxSizing:"border-box"}} />
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:300,background:"#fff",border:"1.5px solid #e8e8e8",borderRadius:10,boxShadow:"0 6px 20px rgba(0,0,0,0.1)",maxHeight:180,overflowY:"auto",marginTop:2}}>
          {filtered.length === 0 && <div style={{padding:"8px 12px",fontSize:12,color:"#bbb"}}>직접 입력으로 추가 가능</div>}
          {filtered.map(ing => (
            <div key={ing}
              onMouseDown={e => { e.preventDefault(); onChange(ing); setQ(ing); setOpen(false); }}
              onMouseEnter={() => setHov(ing)} onMouseLeave={() => setHov(null)}
              style={{padding:"8px 12px",fontSize:13,cursor:"pointer",borderBottom:"1px solid #f5f5f5",
                background:hov===ing?"#f0faf0":"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#333"}}>{ing}</span>
              <span style={{fontSize:10,color:"#aaa"}}>{(cubes.find(c=>c.ingredient===ing)||{}).count||0}개 재고</span>
            </div>
          ))}
          {q.trim() && !allIngs.includes(q.trim()) && (
            <div
              onMouseDown={e => { e.preventDefault(); onChange(q); setOpen(false); }}
              onMouseEnter={() => setHov("__new__")} onMouseLeave={() => setHov(null)}
              style={{padding:"8px 12px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#7BC67E",
                borderTop:"1px solid #f0f0f0",background:hov==="__new__"?"#e8f8e8":"#f9fff9"}}>
              + "{q}" 직접 추가
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────
// 레시피 탭
// ────────────────────────────