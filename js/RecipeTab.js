function RecipeTab({ recipes, setRecipes, cubes, recipeStatus, dishes, stock }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const TYPES = ["일반","밥","국","반찬","소스","기타"];
  const TYPE_COLORS = {일반:"#FFE0B2",밥:"#FFE0A3",국:"#B0E8D0",반찬:"#F8C8C8",소스:"#E8C8F8",기타:"#E8E8E8"};
  const TYPE_ICONS = {일반:"🍽️",밥:"🍚",국:"🍲",반찬:"🥗",소스:"🫙",기타:"🍴"};

  const emptyForm = { name:"", color:"#FFB347", note:"", type:"일반", ingredients:[], unitIds:[], dishId:"", slotMap:{}, slotUnits:{} };
  const [form, setForm] = useState(emptyForm);
  const [sortBy, setSortBy] = useState("name_asc");
  const [hideDisabled, setHideDisabled] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // {id, name}
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("전체");

  const openNew = () => { setEditId(null); setForm(emptyForm); setModal(true); };
  const openEdit = r => { setEditId(r.id); setForm({name:r.name,color:r.color,note:r.note||"",type:r.type||"일반",ingredients:r.ingredients.map(x=>({...x})),unitIds:r.unitIds||[],dishId:r.dishId||"",slotMap:r.slotMap||{},slotUnits:r.slotUnits||{}}); setModal(true); };
  const openCopy = r => { setEditId(null); const newIngs=r.ingredients.map(x=>({...x})); setForm({name:r.name+" (복사)",color:r.color,note:r.note||"",type:r.type||"일반",ingredients:newIngs,unitIds:r.unitIds||[],dishId:r.dishId||"",slotMap:rebuildSlotMap(r.slotMap,newIngs),slotUnits:r.slotUnits||{}}); setModal(true); };

  const addIng = () => setForm(f => ({...f, ingredients:[...f.ingredients, {name:"",cubeCount:1}]}));
  const delIng = i => setForm(f => {
    const removed = f.ingredients[i];
    const newIngs = f.ingredients.filter((_,idx)=>idx!==i);
    const newSlotMap = rebuildSlotMap(
      Object.fromEntries(Object.entries(f.slotMap||{}).map(([slot,tks])=>[slot, tks.filter(tk=>tk.split("__g")[0]!==removed.name)])),
      newIngs
    );
    return {...f, ingredients:newIngs, slotMap:newSlotMap};
  });
  const setIng = (i,k,v) => setForm(f => { const a=[...f.ingredients]; a[i]={...a[i],[k]:k==="cubeCount"?Number(v):v}; return {...f,ingredients:a}; });

  const save = () => {
    const ings = form.ingredients.filter(x=>x.name.trim()).map(x=>({...x,cubeCount:Number(x.cubeCount)||1}));
    if (!form.name || !ings.length) return;
    const cleanSlotMap = rebuildSlotMap(form.slotMap, ings);
    if (editId) {
      setRecipes(rs => rs.map(r => r.id===editId ? {...r,name:form.name,color:form.color,note:form.note,type:form.type||"일반",ingredients:ings,unitIds:form.unitIds||[],dishId:form.dishId,slotMap:cleanSlotMap,slotUnits:form.slotUnits||{},updatedAt:todayStr()} : r));
    } else {
      setRecipes(rs => [...rs, {id:uid(),name:form.name,color:form.color,note:form.note,type:form.type||"일반",ingredients:ings,unitIds:form.unitIds||[],dishId:form.dishId,slotMap:cleanSlotMap,slotUnits:form.slotUnits||{},favorite:false,updatedAt:todayStr()}]);
    }
    setModal(false);
  };

  const sorted = [...recipes].sort((a,b) => {
    if (favOnly) { if(b.favorite&&!a.favorite) return 1; if(a.favorite&&!b.favorite) return -1; }
    if (sortBy==="fav") { if(b.favorite&&!a.favorite) return 1; if(a.favorite&&!b.favorite) return -1; return a.name.localeCompare(b.name,"ko"); }
    if (sortBy==="vol_desc") return cubeVolume(b,cubes,recipes)-cubeVolume(a,cubes,recipes);
    if (sortBy==="vol_asc")  return cubeVolume(a,cubes,recipes)-cubeVolume(b,cubes,recipes);
    if (sortBy==="name_asc") return a.name.localeCompare(b.name,"ko");
    if (sortBy==="name_desc") return b.name.localeCompare(a.name,"ko");
    return 0;
  }).filter(r => !hideDisabled || !(recipeStatus[r.id]||{}).disabled)
    .filter(r => filterType==="전체" || (r.type||"일반")===filterType)
    .filter(r => !search.trim() || r.name.includes(search.trim()));

  const disabledCount = recipes.filter(r => (recipeStatus[r.id]||{}).disabled).length;

  return(
    <div>
      {disabledCount > 0 && (
        <div style={{background:"#fff0f0",border:"1.5px solid #ffb3b3",borderRadius:12,marginBottom:14,overflow:"hidden"}}>
          <div onClick={()=>setBannerOpen(v=>!v)}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",cursor:"pointer"}}>
            <span style={{fontWeight:700,fontSize:13,color:"#c00"}}>🚫 재료 소진 {disabledCount}개</span>
            <span style={{fontSize:11,color:"#e55"}}>{bannerOpen?"▲ 닫기":"▼ 목록 보기"}</span>
          </div>
          {bannerOpen && (
            <div style={{fontSize:11,color:"#e55",padding:"0 14px 10px",lineHeight:1.8}}>
              {recipes.filter(r=>(recipeStatus[r.id]||{}).disabled).map(r=>(
                <span key={r.id} style={{marginRight:8,display:"inline-block"}}>{r.name} ({(recipeStatus[r.id]||{outOfStock:[]}).outOfStock.join(",")} 없음)</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:700,fontSize:16,color:"#333"}}>식단 목록 ({recipes.length})</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setFavOnly(v=>!v)}
            style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(favOnly?"#f9a825":"#e0e0e0"),
              background:favOnly?"#fef08a":"#fff",color:favOnly?"#b45309":"#888",
              fontSize:12,cursor:"pointer",fontWeight:favOnly?700:400}}>
            {favOnly?"⭐ 즐찾 고정":"☆ 즐찾 고정"}
          </button>
          <PillBtn onClick={openNew} small>+ 식단 추가</PillBtn>
        </div>
      </div>

      {/* 검색 */}
      <div style={{position:"relative",marginBottom:10}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#bbb"}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="식단/레시피 검색..."
          style={{width:"100%",padding:"9px 12px 9px 34px",border:"1.5px solid #e8e8e8",borderRadius:12,fontSize:13,outline:"none",background:"#fafafa",boxSizing:"border-box"}} />
        {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:14}}>✕</button>}
      </div>

      {/* 타입 필터 */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {["전체",...TYPES].map(t=>(
          <button key={t} onClick={()=>setFilterType(t)}
            style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid "+(filterType===t?"#555":"#e0e0e0"),
              background:filterType===t?(TYPE_COLORS[t]||"#7BC67E22"):"#fff",
              color:"#444",fontSize:12,cursor:"pointer",fontWeight:filterType===t?700:400}}>
            {TYPE_ICONS[t]||""} {t}
          </button>
        ))}
      </div>

      <SortBar value={sortBy} onChange={setSortBy}
        options={[["name_asc","가나다순"],["name_desc","가나다 역순"],["vol_desc","용량 많은순"],["vol_asc","용량 적은순"]]} />
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        {disabledCount>0 && (
          <button onClick={()=>setHideDisabled(v=>!v)}
            style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(hideDisabled?"#7BC67E":"#e0e0e0"),
              background:hideDisabled?"#e8f8f0":"#fff",color:hideDisabled?"#4a9":"#888",
              fontSize:12,cursor:"pointer",fontWeight:hideDisabled?700:400}}>
            {hideDisabled?`✅ 재료없음 숨기는 중 (${disabledCount}개)`:`🚫 재료없음 ${disabledCount}개 숨기기`}
          </button>
        )}
      </div>

      {sorted.length===0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:"#bbb"}}>
          <div style={{fontSize:40,marginBottom:8}}>🍽️</div>
          <div>{search||filterType!=="전체" ? "검색 결과가 없습니다" : "식단을 추가해보세요!"}</div>
          {!search && filterType==="전체" && <div style={{fontSize:12,marginTop:6,color:"#ccc"}}>완성된 식단(덮밥 등)이나 미역국, 야채전 같은 단품 레시피 모두 여기서 관리해요</div>}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {sorted.map(r => {
          const st = recipeStatus[r.id] || {disabled:false,outOfStock:[]};
          const vol = cubeVolume(r, cubes, recipes);
          const totalC = r.ingredients.reduce((s,x)=>s+(Number(x.cubeCount)||0),0);
          const rType = r.type || "일반";
          return(
            <div key={r.id} style={{background:st.disabled?"#fdf5f5":r.favorite?"#fffde7":"#fff",borderRadius:16,padding:16,borderLeft:"4px solid "+(st.disabled?"#ffb3b3":r.color),boxShadow:"0 2px 12px rgba(0,0,0,0.04)",position:"relative",overflow:"hidden"}}>
              {st.disabled && <div style={{position:"absolute",top:0,right:0,background:"#e55",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderBottomLeftRadius:10}}>재료 없음</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,paddingRight:st.disabled?50:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{background:TYPE_COLORS[rType]||"#eee",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,color:"#555"}}>
                      {TYPE_ICONS[rType]||"🍴"} {rType}
                    </span>
                    <span style={{fontWeight:700,fontSize:r.favorite?17:15,color:st.disabled?"#999":r.favorite?"#92400e":"#333"}}>{st.disabled&&"🚫 "}{r.favorite&&<span style={{marginRight:3}}>⭐</span>}{r.name}</span>
                    <span style={{background:(st.disabled?"#ddd":r.color)+"22",border:"1px solid "+(st.disabled?"#ddd":r.color)+"66",borderRadius:20,padding:"1px 8px",fontSize:11,color:st.disabled?"#bbb":"#555",fontWeight:600}}>🧊 {totalC}개</span>
                    {vol>0 && <span style={{background:st.disabled?"#f5f5f5":"#e8f8f0",border:"1px solid "+(st.disabled?"#ddd":"#ade"),borderRadius:20,padding:"1px 8px",fontSize:11,color:st.disabled?"#bbb":"#4a9",fontWeight:600}}>💧 {vol}g</span>}
                  </div>
                  {/* 하위(부품) 레시피 표시 */}
                  {(r.unitIds||[]).length > 0 && (
                    <div style={{marginBottom:6,display:"flex",flexWrap:"wrap",gap:4}}>
                      {(r.unitIds||[]).map(uId=>{
                        const u = recipes.find(x=>x.id===uId);
                        if(!u) return null;
                        return <span key={uId} style={{background:u.color+"22",border:"1.5px solid "+u.color+"88",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600,color:"#444"}}>{TYPE_ICONS[u.type||"일반"]||"🍱"} {u.name}</span>;
                      })}
                    </div>
                  )}
                  <div style={{marginBottom:4}}>
                    {r.ingredients.map(ing => {
                      const oos = st.outOfStock.includes(ing.name);
                      const cube = cubes.find(c=>c.ingredient===ing.name);
                      const avail = cube ? (stock[ing.name]??0) : null;
                      const needed = Number(ing.cubeCount)||0;
                      const shortage = oos && avail!==null ? needed - avail : 0;
                      return(
                        <span key={ing.name} style={{display:"inline-flex",alignItems:"center",gap:3,background:oos?"#fff0f0":(st.disabled?"#f5f5f5":r.color+"18"),border:"1px solid "+(oos?"#ffb3b3":(st.disabled?"#e0e0e0":r.color+"55")),borderRadius:20,padding:"2px 8px",marginRight:5,marginBottom:4,fontSize:11}}>
                          {oos && <span style={{fontSize:10}}>⚠️</span>}
                          <span style={{color:oos?"#e55":"#555"}}>{ing.name}</span>
                          <span style={{fontWeight:700,color:oos?"#e55":(st.disabled?"#bbb":r.color)}}>x{ing.cubeCount}</span>
                          {oos && <span style={{fontSize:9,color:"#e55",fontWeight:700}}>{shortage>0?shortage+"개 부족":"소진"}</span>}
                        </span>
                      );
                    })}
                  </div>
                  {st.disabled && <div style={{marginTop:6,background:"#fff0f0",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#e55",fontWeight:600}}>🚫 재고 없음: <strong>{st.outOfStock.join(", ")}</strong></div>}
                  {r.note && <div style={{fontSize:12,color:"#999",marginTop:4}}>{r.note}</div>}
                  {r.dishId && (()=>{const d=(dishes||[]).find(x=>x.id===r.dishId);return d?<div style={{fontSize:11,color:"#7a9",marginTop:4,display:"flex",alignItems:"center",gap:4}}><span>{d.icon}</span><span>{d.name}</span></div>:null;})()}
                  {r.updatedAt && <div style={{fontSize:10,color:"#bbb",marginTop:4}}>✏️ 수정: {r.updatedAt}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginLeft:8,flexShrink:0}}>
                  <button onClick={()=>setRecipes(rs=>rs.map(x=>x.id===r.id?{...x,favorite:!x.favorite}:x))}
                    style={{background:r.favorite?"#fef08a":"#f5f5f5",border:"1.5px solid "+(r.favorite?"#f9a825":"#e0e0e0"),borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:16,lineHeight:1}}>
                    {r.favorite?"⭐":"☆"}
                  </button>
                  <button onClick={()=>openEdit(r)} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>수정</button>
                  <button onClick={()=>openCopy(r)} style={{background:"#e8f8f0",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#4a9"}}>복사</button>
                  <button onClick={()=>setConfirmDel({id:r.id,name:r.name})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#e87"}}>삭제</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Overlay open={modal} onClose={()=>setModal(false)} title={editId?"식단 수정":"새 식단 추가"}>
        {/* 타입 선택 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:6}}>종류</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TYPES.map(t=>(
              <div key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                style={{padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:form.type===t?700:400,
                  background:form.type===t?(TYPE_COLORS[t]||"#e8f8f0"):"#f5f5f5",
                  border:"1.5px solid "+(form.type===t?"#555":"transparent"),color:"#444"}}>
                {TYPE_ICONS[t]} {t}
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:"#bbb",marginTop:4}}>완성된 한 끼 식단이면 "일반", 다른 식단의 부품으로 쓸 단품(반찬, 국 등)이면 해당 종류를 선택하세요</div>
        </div>
        <Field label="이름" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="단호박죽 / 미역국 / 야채전 등" />
        <Field label="메모" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} placeholder="특이사항 등" />
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:4}}>색상</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {RECIPE_COLORS.map(c => (
              <div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:50,background:c,cursor:"pointer",border:form.color===c?"3px solid #333":"3px solid transparent"}} />
            ))}
          </div>
        </div>
        {/* 하위(부품) 레시피 선택 섹션 */}
        {recipes.filter(x=>x.id!==editId).length > 0 && (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#888",marginBottom:8,fontWeight:600}}>🍱 다른 식단/레시피를 부품으로 구성</div>
            {(form.unitIds||[]).length > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                {(form.unitIds||[]).map((uId,uidx)=>{
                  const u = recipes.find(x=>x.id===uId);
                  if(!u) return null;
                  return(
                    <div key={uidx} style={{display:"flex",alignItems:"center",gap:4,background:u.color+"22",
                      border:"1.5px solid "+u.color+"88",borderRadius:20,padding:"3px 10px",fontSize:12}}>
                      <span style={{fontSize:10,background:u.color+"44",borderRadius:10,padding:"1px 5px",color:"#555"}}>{u.type||"일반"}</span>
                      <span style={{fontWeight:600,color:"#333"}}>{u.name}</span>
                      <button onClick={()=>setForm(f=>({...f,unitIds:(f.unitIds||[]).filter((_,i)=>i!==uidx)}))}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:13,padding:"0 2px",lineHeight:1}}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <select onChange={e=>{
              const val = e.target.value;
              if(!val) return;
              if(!(form.unitIds||[]).includes(val)) {
                setForm(f=>({...f, unitIds:[...(f.unitIds||[]), val]}));
              }
              e.target.value = "";
            }}
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e8e8e8",borderRadius:12,
                fontSize:13,outline:"none",background:"#fafafa",cursor:"pointer"}}>
              <option value="">+ 식단/레시피 추가...</option>
              {TYPES.map(type=>{
                const filtered = recipes.filter(u=>(u.type||"일반")===type && u.id!==editId);
                if(filtered.length===0) return null;
                return(
                  <optgroup key={type} label={type}>
                    {filtered.map(u=>(
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {(form.unitIds||[]).length > 0 && (
              <div style={{fontSize:11,color:"#7a9",marginTop:6}}>
                ✅ 총 {(form.unitIds||[]).reduce((s,uId)=>{
                  const u=recipes.find(x=>x.id===uId);
                  return s+(u?u.ingredients.reduce((s2,i)=>s2+(Number(i.cubeCount)||0),0):0);
                },0)}개 큐브 사용
              </div>
            )}
          </div>
        )}
        {/* 추가 큐브 재료 섹션 */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:12,color:"#888"}}>재료 & 큐브 수 <span style={{fontSize:10,color:"#bbb"}}>(부품 외 추가 재료)</span></div>
            <button onClick={addIng} style={{background:"#f0f0f0",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>+ 추가</button>
          </div>
          {form.ingredients.map((ing,i) => (
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <IngSearch value={ing.name} onChange={v=>setIng(i,"name",v)} cubes={cubes} />
              <input value={ing.cubeCount} onChange={e=>setIng(i,"cubeCount",e.target.value)} type="number" min="1"
                style={{width:50,padding:"8px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,outline:"none",background:"#fafafa",textAlign:"center"}} />
              <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>개</span>
              {form.ingredients.length>1 && (
                <button onClick={()=>delIng(i)} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"#e87",flexShrink:0}}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:6}}>식기 지정 <span style={{fontSize:11,color:"#bbb",fontWeight:400}}>(선택사항)</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            <div onClick={()=>setForm(f=>({...f,dishId:"",slotMap:{}}))}
              style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:12,background:!form.dishId?"#7BC67E22":"#f5f5f5",border:"1.5px solid "+(!form.dishId?"#7BC67E":"transparent"),fontWeight:!form.dishId?700:400,color:"#555"}}>
              없음
            </div>
            {(dishes||[]).map(d=>(
              <div key={d.id} onClick={()=>setForm(f=>({...f,dishId:d.id,slotMap:{}}))}
                style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:12,background:form.dishId===d.id?"#7BC67E22":"#f5f5f5",border:"1.5px solid "+(form.dishId===d.id?"#7BC67E":"transparent"),fontWeight:form.dishId===d.id?700:400,color:"#444",display:"flex",alignItems:"center",gap:4}}>
                <span>{d.icon}</span><span>{d.name}</span>
              </div>
            ))}
          </div>
          {form.dishId && (()=>{
            const dish = (dishes||[]).find(d=>d.id===form.dishId);
            if (!dish) return null;
            const ings = form.ingredients.filter(x=>x.name.trim()).map(x=>({...x,cubeCount:Number(x.cubeCount)||1}));
            if (ings.length===0) return <div style={{fontSize:11,color:"#bbb"}}>재료를 먼저 추가하세요</div>;
            return(
              <div style={{background:"#f9f9f9",borderRadius:14,padding:12}}>
                <div style={{fontSize:11,color:"#888",marginBottom:8,fontWeight:600}}>{dish.icon} {dish.name} — 재료를 각 칸에 배치하세요</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(dish.slots.length,3)+",1fr)",gap:6}}>
                  {(()=>{
                    const tokens = ingredientsToTokens(ings);
                    const allSlotKeys = dish.slots.flatMap(s=>form.slotMap[s]||[]);
                    return dish.slots.map((slot,si)=>{
                      const slotKeys = form.slotMap[slot]||[];
                      return(
                        <div key={slot} style={{borderRadius:10,border:"2px solid "+SLOT_COLORS[si],background:"#fff",padding:"8px 6px"}}>
                          <div style={{fontSize:10,fontWeight:700,textAlign:"center",marginBottom:6,color:"#555",background:SLOT_COLORS[si],borderRadius:6,padding:"2px 4px"}}>{slot}</div>
                          {/* 슬롯에 부품 레시피 지정 */}
                          {recipes.filter(x=>x.id!==editId).length > 0 && (
                            <div style={{marginBottom:6}}>
                              <select
                                value={(form.slotUnits||{})[slot]||""}
                                onChange={e=>setForm(f=>({...f,slotUnits:{...(f.slotUnits||{}),[slot]:e.target.value||null}}))}
                                style={{width:"100%",fontSize:9,padding:"2px 4px",borderRadius:6,border:"1px solid #ddd",
                                  background:(form.slotUnits||{})[slot]
                                    ? (recipes.find(u=>u.id===(form.slotUnits||{})[slot])?.color||"#fff")+"33"
                                    : "#fafafa",cursor:"pointer"}}>
                                <option value="">부품 없음</option>
                                {recipes.filter(x=>x.id!==editId).map((u)=>(
                                  <option key={u.id} value={u.id}>{u.type||"일반"} {u.name}</option>
                                ))}
                              </select>
                              {(form.slotUnits||{})[slot] && (()=>{
                                const su = recipes.find(u=>u.id===(form.slotUnits||{})[slot]);
                                if(!su) return null;
                                return <div style={{fontSize:9,color:"#4a9",marginTop:2,textAlign:"center"}}>🧊 {su.ingredients.reduce((s,i)=>s+(Number(i.cubeCount)||0),0)}개</div>;
                              })()}
                            </div>
                          )}
                          {tokens.map(tok=>{
                            const checked = slotKeys.includes(tok.tokenKey);
                            const inOtherSlot = !checked && dish.slots.some(s=>s!==slot&&(form.slotMap[s]||[]).includes(tok.tokenKey));
                            const allSlotKeysCount = allSlotKeys.filter(k=>k===tok.tokenKey).length;
                            const blocked = inOtherSlot || (!checked && allSlotKeysCount >= 1);
                            return(
                              <div key={slot+"-"+tok.tokenKey}
                                onClick={()=>{
                                  if(blocked) return;
                                  setForm(f=>{
                                    const cur = f.slotMap[slot]||[];
                                    const next = cur.includes(tok.tokenKey)?cur.filter(x=>x!==tok.tokenKey):[...cur,tok.tokenKey];
                                    return {...f,slotMap:{...f.slotMap,[slot]:next}};
                                  });
                                }}
                                style={{display:"flex",alignItems:"center",gap:4,cursor:blocked?"not-allowed":"pointer",padding:"4px 6px",borderRadius:8,marginBottom:3,
                                  background:checked?form.color+"33":blocked?"#f0f0f0":"transparent",opacity:blocked&&!checked?0.4:1}}>
                                <span style={{width:12,height:12,borderRadius:3,flexShrink:0,border:"2px solid "+(checked?form.color:blocked?"#ddd":"#ccc"),background:checked?form.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {checked&&<span style={{color:"#fff",fontSize:8,fontWeight:700}}>✓</span>}
                                </span>
                                <span style={{fontSize:10,color:blocked&&!checked?"#bbb":"#444"}}>
                                  {tokenLabel(tok.tokenKey, tokens)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div style={{fontSize:10,color:"#bbb",marginTop:6}}>* 같은 재료는 한 칸에만 배치 가능해요</div>
              </div>
            );
          })()}
        </div>
        <PillBtn onClick={save} full>저장</PillBtn>
      </Overlay>
      <ConfirmDelete
        open={!!confirmDel}
        message={confirmDel ? `"${confirmDel.name}" 식단을 삭제할까요?` : ""}
        onConfirm={()=>{ setRecipes(rs=>rs.filter(x=>x.id!==confirmDel.id)); setConfirmDel(null); }}
        onCancel={()=>setConfirmDel(null)}
      />
    </div>
  );
}
