function CubeTab({ recipes, cubes, setCubes, stock, recipeStatus, categories, setCategories, makingIds=[], setMakingIds }) {
  const [modal, setModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editCatId, setEditCatId] = useState(null);
  const [form, setForm] = useState({ingredient:"",count:"",madeDate:todayStr(),weightG:"",categoryId:""});
  const [catForm, setCatForm] = useState({name:"",color:"#C8F0C0"});
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("stock_asc");

  const [confirmDel, setConfirmDel] = useState(null);
  const openNew = () => { setEditId(null); setForm({ingredient:"",count:"",madeDate:todayStr(),weightG:"",categoryId:""}); setModal(true); };
  const openEdit = c => { setEditId(c.id); setForm({ingredient:c.ingredient,count:"0",madeDate:c.madeDate,weightG:String(c.weightG||""),categoryId:c.categoryId||""}); setModal(true); };

  const saveCube = () => {
    if (!form.ingredient || form.count === "" || form.count === null) return;
    const entry = {ingredient:form.ingredient,count:Number(form.count),madeDate:form.madeDate,weightG:Number(form.weightG)||0,categoryId:form.categoryId,updatedAt:todayStr()};
    if (editId) {
      setCubes(cs=>cs.map(c=>c.id===editId?{...c,...entry,count:Math.max(0,c.count+entry.count)}:c));
    } else {
      const ex = cubes.find(c=>c.ingredient===form.ingredient);
      if (ex) {
        setCubes(cs=>cs.map(c=>c.ingredient===form.ingredient?{...c,count:c.count+entry.count,madeDate:entry.madeDate,weightG:entry.weightG||c.weightG,categoryId:entry.categoryId||c.categoryId,updatedAt:todayStr()}:c));
      } else {
        setCubes(cs=>[...cs,{id:uid(),...entry}]);
      }
    }
    setModal(false);
  };

  const openCatNew = () => { setEditCatId(null); setCatForm({name:"",color:"#C8F0C0"}); setCatModal(true); };
  const openCatEdit = cat => { setEditCatId(cat.id); setCatForm({name:cat.name,color:cat.color}); };
  const saveCat = () => {
    if (!catForm.name.trim()) return;
    if (editCatId) { setCategories(cs=>cs.map(c=>c.id===editCatId?{...c,...catForm}:c)); }
    else { setCategories(cs=>[...cs,{id:uid(),...catForm}]); }
    setEditCatId(null); setCatForm({name:"",color:"#C8F0C0"});
  };

  const display = cubes
    .filter(c => {
      const ms = search.trim()===""||c.ingredient.includes(search.trim());
      const mc = filterCat==="all"||c.categoryId===filterCat||(!c.categoryId&&filterCat==="none");
      return ms && mc;
    })
    .sort((a,b) => {
      const ea=stock[a.ingredient]||0, eb=stock[b.ingredient]||0;
      if (sortBy==="stock_desc") return eb-ea;
      if (sortBy==="stock_asc")  return ea-eb;
      if (sortBy==="name_asc")   return a.ingredient.localeCompare(b.ingredient,"ko");
      if (sortBy==="name_desc")  return b.ingredient.localeCompare(a.ingredient,"ko");
      return ea-eb;
    });

  const empties = cubes.filter(c=>(stock[c.ingredient]||0)===0);
  const lows    = cubes.filter(c=>{const e=stock[c.ingredient]||0;return e>0&&e<5;});

  return(
    <div>
      {empties.length>0 && (
        <div style={{background:"#fff0f0",border:"1.5px solid #ffb3b3",borderRadius:14,padding:"12px 16px",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13,color:"#c00",marginBottom:6}}>🚫 소진 ({empties.length}종)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {empties.map(c=>(
              <span key={c.id} onClick={()=>setMakingIds(p=>p.includes(c.id)?p:[...p,c.id])}
                style={{background:"#ffd6d6",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,color:"#c00",cursor:"pointer",opacity:makingIds.includes(c.id)?0.4:1}}>
                {c.ingredient} 0개
              </span>
            ))}
          </div>
        </div>
      )}
      {lows.length>0 && (
        <div style={{background:"#fff3cd",border:"1.5px solid #ffc107",borderRadius:14,padding:"12px 16px",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13,color:"#856404",marginBottom:6}}>⚠️ 부족 ({lows.length}종)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {lows.map(c=>(
              <span key={c.id} onClick={()=>setMakingIds(p=>p.includes(c.id)?p:[...p,c.id])}
                style={{background:"#ffe08a",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#856404",cursor:"pointer",opacity:makingIds.includes(c.id)?0.4:1}}>
                {c.ingredient} {stock[c.ingredient]}개
              </span>
            ))}
          </div>
        </div>
      )}
      {makingIds.length>0 && (
        <div style={{background:"#e8f4fd",border:"1.5px solid #7BC9E8",borderRadius:14,padding:"12px 16px",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13,color:"#1a6fa8",marginBottom:6}}>🍳 제조 중 ({makingIds.length}종)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {makingIds.map(id=>{
              const c = cubes.find(x=>x.id===id); if(!c) return null;
              return (
                <span key={id} onClick={()=>{ setEditId(c.id); setForm({ingredient:c.ingredient,count:c.count,madeDate:c.madeDate,weightG:c.weightG,categoryId:c.categoryId||""}); setModal(true); setMakingIds(p=>p.filter(x=>x!==id)); }}
                  style={{background:"#b3e0f7",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,color:"#1a6fa8",cursor:"pointer"}}>
                  {c.ingredient} {stock[c.ingredient]}개 ✏️
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontWeight:700,fontSize:16,color:"#333"}}>큐브 재고 관리</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setCatModal(true)} style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:11,color:"#666"}}>📂 카테고리</button>
          <PillBtn onClick={openNew} small>+ 큐브 추가</PillBtn>
        </div>
      </div>
      <div style={{position:"relative",marginBottom:10}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#bbb"}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="재료명 검색..."
          style={{width:"100%",padding:"9px 12px 9px 34px",border:"1.5px solid #e8e8e8",borderRadius:12,fontSize:13,outline:"none",background:"#fafafa",boxSizing:"border-box"}} />
        {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:14}}>✕</button>}
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setFilterCat("all")} style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:filterCat==="all"?700:400,border:"1.5px solid "+(filterCat==="all"?"#7BC67E":"#e0e0e0"),background:filterCat==="all"?"#7BC67E22":"#fff",color:filterCat==="all"?"#4a9":"#888"}}>전체</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={()=>setFilterCat(filterCat===cat.id?"all":cat.id)}
            style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:filterCat===cat.id?700:400,border:"1.5px solid "+(filterCat===cat.id?"#555":"#e0e0e0"),background:filterCat===cat.id?cat.color:cat.color+"55",color:"#444"}}>
            {cat.name}
          </button>
        ))}
      </div>
      <SortBar value={sortBy} onChange={setSortBy}
        options={[["stock_asc","재고 적은순"],["stock_desc","재고 많은순"],["name_asc","가나다순"],["name_desc","가나다 역순"]]} />
      {display.length===0 && <div style={{textAlign:"center",padding:32,color:"#bbb",fontSize:13}}>{search?"검색 결과 없음 🔍":"큐브를 추가해보세요 🧊"}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {display.map(c => {
          const eff = stock[c.ingredient]||0;
          const isEmpty = eff===0;
          const isLow = !isEmpty&&eff<5;
          const pct = Math.min(100,(eff/Math.max(c.count,1))*100);
          const blocked = recipes.filter(r=>(recipeStatus[r.id]||{outOfStock:[]}).outOfStock.includes(c.ingredient));
          const cat = categories.find(x=>x.id===c.categoryId);
          return(
            <div key={c.id} style={{background:isEmpty?"#fff5f5":"#fff",borderRadius:16,padding:"14px 16px",border:"1.5px solid "+(isEmpty?"#ffb3b3":isLow?"#ffc107":"#f0f0f0"),boxShadow:"0 2px 10px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:15,color:isEmpty?"#c00":"#333"}}>{c.ingredient}</span>
                    {isEmpty && <span style={{fontSize:11,background:"#e55",color:"#fff",borderRadius:10,padding:"1px 7px",fontWeight:700}}>소진</span>}
                    {isLow && <span style={{fontSize:11,color:"#e68",fontWeight:700}}>⚠️ 부족</span>}
                    {cat && <span style={{fontSize:10,background:cat.color,borderRadius:10,padding:"1px 8px",color:"#555",fontWeight:600}}>{cat.name}</span>}
                  </div>
                  {c.weightG>0 && <span style={{fontSize:11,color:"#777",background:"#f5f5f5",borderRadius:10,padding:"1px 8px",marginTop:4,display:"inline-block"}}>1개 = {c.weightG}g</span>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:18,color:isEmpty?"#e55":isLow?"#e68":"#7BC67E",lineHeight:1}}>{eff}</div>
                    <div style={{fontSize:10,color:"#bbb"}}>/ {c.count}개</div>
                  </div>
                  <button onClick={()=>openEdit(c)} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#666"}}>수정</button>
                  <button onClick={()=>setConfirmDel({id:c.id,name:c.ingredient})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#e87"}}>삭제</button>
                </div>
              </div>
              <div style={{background:"#f0f0f0",borderRadius:10,height:6,marginBottom:6}}>
                <div style={{width:pct+"%",height:"100%",borderRadius:10,background:isEmpty?"#e55":isLow?"#ffc107":"#7BC67E"}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa"}}>
                <span>제조일: {c.madeDate}</span>
                {c.weightG>0&&eff>0 && <span style={{color:"#4a9",fontWeight:600}}>잔여 {eff*c.weightG}g</span>}
              </div>
              {isEmpty&&blocked.length>0 && (
                <div style={{marginTop:8,background:"#fff0f0",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#e55"}}>
                  🚫 비활성 레시피: <strong>{blocked.map(r=>r.name).join(", ")}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {recipes.length>0 && (
        <div style={{marginTop:24}}>
          <div style={{fontWeight:700,fontSize:14,color:"#555",marginBottom:12}}>레시피별 재료 현황</div>
          {recipes.map(r => {
            const vol = cubeVolume(r,cubes);
            const hasE = r.ingredients.some(ing=>{const reg=cubes.find(c=>c.ingredient===ing.name);return reg&&(stock[ing.name]||0)===0;});
            return(
              <div key={r.id} style={{background:hasE?"#fff5f5":r.color+"12",borderLeft:"3px solid "+(hasE?"#e55":r.color),borderRadius:12,padding:"10px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:13,color:hasE?"#c00":"#444"}}>{hasE&&"🚫 "}{r.name}</span>
                  {hasE?<span style={{fontSize:11,color:"#e55",fontWeight:700}}>사용 불가</span>:vol>0&&<span style={{fontSize:11,color:"#4a9",fontWeight:600}}>{vol}g</span>}
                </div>
                <div>
                  {r.ingredients.map(ing => {
                    const eff2 = stock[ing.name];
                    const reg = cubes.find(c=>c.ingredient===ing.name);
                    const e2 = reg&&eff2===0;
                    return(
                      <span key={ing.name} style={{display:"inline-flex",alignItems:"center",gap:4,background:e2?"#fff0f0":"#fff",border:"1px solid "+(e2?"#ffb3b3":r.color+"55"),borderRadius:20,padding:"2px 10px",marginRight:6,marginBottom:4,fontSize:11,color:"#555"}}>
                        {e2&&"⚠️ "}{ing.name} x{ing.cubeCount}
                        {eff2!=null?<span style={{fontWeight:700,color:e2?"#e55":eff2<5?"#e68":"#7BC67E"}}>재고 {eff2}개</span>:<span style={{color:"#ccc"}}>미등록</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Overlay open={modal} onClose={()=>setModal(false)} title={editId?"큐브 수정 (추가 수량 입력)":"큐브 추가"}>
        {editId && (()=>{ const cur = cubes.find(c=>c.id===editId); return cur ? <div style={{background:"#e8f8f0",border:"1px solid #7BC67E55",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#4a9"}}>현재 재고: <strong>{cur.count}개</strong> → 추가는 양수, 감소는 음수로 입력</div> : null; })()}
        <Field label="재료명" value={form.ingredient} onChange={v=>setForm(f=>({...f,ingredient:v}))} placeholder="단호박" />
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:6}}>카테고리</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            <div onClick={()=>setForm(f=>({...f,categoryId:""}))} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:12,color:"#666",fontWeight:!form.categoryId?700:400,background:!form.categoryId?"#7BC67E22":"#f5f5f5",border:"1.5px solid "+(!form.categoryId?"#7BC67E":"transparent")}}>미분류</div>
            {categories.map(cat => (
              <div key={cat.id} onClick={()=>setForm(f=>({...f,categoryId:cat.id}))} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:12,color:"#444",fontWeight:form.categoryId===cat.id?700:400,background:form.categoryId===cat.id?cat.color:cat.color+"55",border:"1.5px solid "+(form.categoryId===cat.id?"#555":"transparent")}}>{cat.name}</div>
            ))}
          </div>
        </div>
        <Field label={editId?"추가/감소 수량":"제조 개수"} value={form.count} onChange={v=>setForm(f=>({...f,count:v}))} placeholder={editId?"양수=추가, 음수=감소":"30"} type="number" />
        <Field label="큐브 1개 무게(g)" value={form.weightG} onChange={v=>setForm(f=>({...f,weightG:v}))} placeholder="15" type="number" />
        <Field label="제조일" value={form.madeDate} onChange={v=>setForm(f=>({...f,madeDate:v}))} type="date" />
        <PillBtn onClick={saveCube} full disabled={!form.ingredient||!form.count}>저장</PillBtn>
      </Overlay>
      <Overlay open={catModal} onClose={()=>{setCatModal(false);setEditCatId(null);setCatForm({name:"",color:"#C8F0C0"});}} title="카테고리 관리">
        <div style={{marginBottom:16}}>
          {categories.map(cat => (
            <div key={cat.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 12px",background:cat.color+"55",borderRadius:12}}>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:"#444"}}>{cat.name}</span>
              <button onClick={()=>openCatEdit(cat)} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#666"}}>수정</button>
              <button onClick={()=>setConfirmDel({id:"cat_"+cat.id,name:"[카테고리] "+cat.name,catId:cat.id})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#e87"}}>삭제</button>
            </div>
          ))}
        </div>
        <div style={{background:"#f9f9f9",borderRadius:14,padding:14}}>
          <div style={{fontSize:12,color:"#888",marginBottom:8,fontWeight:600}}>{editCatId?"카테고리 수정":"새 카테고리 추가"}</div>
          <Field value={catForm.name} onChange={v=>setCatForm(f=>({...f,name:v}))} placeholder="카테고리 이름..." />
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            {CAT_COLORS.map(c=>(<div key={c} onClick={()=>setCatForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:catForm.color===c?"3px solid #333":"3px solid transparent"}} />))}
          </div>
          <div style={{display:"flex",gap:8}}>
            {editCatId && <PillBtn onClick={()=>{setEditCatId(null);setCatForm({name:"",color:"#C8F0C0"});}} color="#aaa" small outline>취소</PillBtn>}
            <div style={{flex:1}}><PillBtn onClick={saveCat} full disabled={!catForm.name.trim()}>{editCatId?"수정 저장":"추가"}</PillBtn></div>
          </div>
        </div>
      </Overlay>
      <ConfirmDelete
        open={!!confirmDel}
        message={confirmDel ? `"${confirmDel.name}"을 삭제할까요?` : ""}
        onConfirm={()=>{
          if (confirmDel.catId) setCategories(cs=>cs.filter(x=>x.id!==confirmDel.catId));
          else setCubes(cs=>cs.filter(x=>x.id!==confirmDel.id));
          setConfirmDel(null);
        }}
        onCancel={()=>setConfirmDel(null)}
      />
    </div>
  );
}

// ────────────────────────────
// 간식 레시피 탭
// ────────────────────────────