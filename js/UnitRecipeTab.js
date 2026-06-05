function UnitRecipeTab({ unitRecipes, setUnitRecipes, cubes, stock, categories }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("전체");
  const emptyForm = { name:"", type:"반찬", color:"#7BC67E", note:"", ingredients:[{name:"",cubeCount:1}] };
  const [form, setForm] = useState(emptyForm);

  const UNIT_TYPES = ["밥","국","반찬","소스","기타"];
  const TYPE_COLORS = {밥:"#FFE0A3",국:"#B0E8D0",반찬:"#F8C8C8",소스:"#E8C8F8",기타:"#E8E8E8"};
  const TYPE_ICONS = {밥:"🍚",국:"🍲",반찬:"🥗",소스:"🫙",기타:"🍴"};

  const openNew = () => { setEditId(null); setForm(emptyForm); setModal(true); };
  const openEdit = r => { setEditId(r.id); setForm({name:r.name,type:r.type||"반찬",color:r.color,note:r.note||"",ingredients:r.ingredients.map(x=>({...x}))}); setModal(true); };

  const addIng = () => setForm(f=>({...f,ingredients:[...f.ingredients,{name:"",cubeCount:1}]}));
  const delIng = i => setForm(f=>({...f,ingredients:f.ingredients.filter((_,idx)=>idx!==i)}));
  const setIng = (i,k,v) => setForm(f=>{const a=[...f.ingredients];a[i]={...a[i],[k]:k==="cubeCount"?Number(v):v};return {...f,ingredients:a};});

  const save = () => {
    const ings = form.ingredients.filter(x=>x.name.trim()).map(x=>({...x,cubeCount:Number(x.cubeCount)||1}));
    if (!form.name||!ings.length) return;
    if (editId) {
      setUnitRecipes(rs=>rs.map(r=>r.id===editId?{...r,...form,ingredients:ings,updatedAt:todayStr()}:r));
    } else {
      setUnitRecipes(rs=>[...rs,{id:uid(),name:form.name,type:form.type,color:form.color,note:form.note,ingredients:ings,updatedAt:todayStr()}]);
    }
    setModal(false);
  };

  const filtered = unitRecipes.filter(r=>{
    const ms = !search || r.name.includes(search);
    const mt = filterType==="전체" || r.type===filterType;
    return ms && mt;
  });

  // 재료 부족 여부 체크
  const getStatus = (r) => {
    const oos = r.ingredients.filter(ing=>{
      const cube = cubes.find(c=>c.ingredient===ing.name);
      if(!cube) return false;
      return (stock[ing.name]||0) < (Number(ing.cubeCount)||0);
    });
    return { disabled: oos.length>0, outOfStock: oos.map(i=>i.name) };
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:700,fontSize:16,color:"#333"}}>유닛 레시피 ({unitRecipes.length})</span>
        <PillBtn onClick={openNew} small>+ 추가</PillBtn>
      </div>
      {/* 검색 */}
      <div style={{position:"relative",marginBottom:10}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#bbb"}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="유닛 레시피 검색..."
          style={{width:"100%",padding:"9px 12px 9px 34px",border:"1.5px solid #e8e8e8",borderRadius:12,fontSize:13,outline:"none",background:"#fafafa",boxSizing:"border-box"}} />
      </div>
      {/* 타입 필터 */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["전체",...UNIT_TYPES].map(t=>(
          <button key={t} onClick={()=>setFilterType(t)}
            style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid "+(filterType===t?"#555":"#e0e0e0"),
              background:filterType===t?(TYPE_COLORS[t]||"#7BC67E22"):"#fff",
              color:"#444",fontSize:12,cursor:"pointer",fontWeight:filterType===t?700:400}}>
            {TYPE_ICONS[t]||""} {t}
          </button>
        ))}
      </div>
      {/* 레시피 목록 */}
      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:"#bbb"}}>
          <div style={{fontSize:40,marginBottom:8}}>🍱</div>
          <div>유닛 레시피를 추가해보세요!</div>
          <div style={{fontSize:12,marginTop:6,color:"#ccc"}}>미역국, 야채전, 현미밥 등 단품 레시피</div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(r=>{
          const st = getStatus(r);
          const vol = r.ingredients.reduce((s,ing)=>{
            const cube=cubes.find(c=>c.ingredient===ing.name);
            return s+(Number(ing.cubeCount)||0)*(cube?Number(cube.weightG)||0:0);
          },0);
          const totalC = r.ingredients.reduce((s,x)=>s+(Number(x.cubeCount)||0),0);
          return(
            <div key={r.id} style={{background:st.disabled?"#fdf5f5":"#fff",borderRadius:16,padding:16,
              borderLeft:"4px solid "+(st.disabled?"#ffb3b3":r.color),
              boxShadow:"0 2px 12px rgba(0,0,0,0.04)",position:"relative"}}>
              {st.disabled && <div style={{position:"absolute",top:0,right:0,background:"#e55",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderBottomLeftRadius:10}}>재료 없음</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{background:TYPE_COLORS[r.type]||"#eee",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,color:"#555"}}>
                      {TYPE_ICONS[r.type]||"🍴"} {r.type||"기타"}
                    </span>
                    <span style={{fontWeight:700,fontSize:15,color:st.disabled?"#999":"#333"}}>{r.name}</span>
                    <span style={{background:r.color+"22",border:"1px solid "+r.color+"66",borderRadius:20,padding:"1px 8px",fontSize:11,color:"#555",fontWeight:600}}>🧊 {totalC}개</span>
                    {vol>0&&<span style={{background:"#e8f8f0",borderRadius:20,padding:"1px 8px",fontSize:11,color:"#4a9",fontWeight:600}}>💧 {vol}g</span>}
                  </div>
                  <div>
                    {r.ingredients.map(ing=>{
                      const oos = st.outOfStock.includes(ing.name);
                      return(
                        <span key={ing.name} style={{display:"inline-flex",alignItems:"center",gap:3,
                          background:oos?"#fff0f0":r.color+"18",border:"1px solid "+(oos?"#ffb3b3":r.color+"55"),
                          borderRadius:20,padding:"2px 8px",marginRight:5,marginBottom:4,fontSize:11}}>
                          {oos&&"⚠️ "}<span style={{color:oos?"#e55":"#555"}}>{ing.name}</span>
                          <span style={{fontWeight:700,color:oos?"#e55":r.color}}>x{ing.cubeCount}</span>
                        </span>
                      );
                    })}
                  </div>
                  {r.note&&<div style={{fontSize:12,color:"#999",marginTop:4}}>{r.note}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginLeft:8,flexShrink:0}}>
                  <button onClick={()=>openEdit(r)} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>수정</button>
                  <button onClick={()=>setConfirmDel({id:r.id,name:r.name})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#e87"}}>삭제</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 추가/수정 모달 */}
      <Overlay open={modal} onClose={()=>setModal(false)} title={editId?"유닛 레시피 수정":"유닛 레시피 추가"}>
        {/* 타입 선택 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:6}}>종류</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {UNIT_TYPES.map(t=>(
              <div key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                style={{padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:form.type===t?700:400,
                  background:form.type===t?(TYPE_COLORS[t]||"#e8f8f0"):"#f5f5f5",
                  border:"1.5px solid "+(form.type===t?"#555":"transparent"),color:"#444"}}>
                {TYPE_ICONS[t]} {t}
              </div>
            ))}
          </div>
        </div>
        <Field label="이름" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="미역국, 야채전, 현미밥 등" />
        <Field label="메모" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} placeholder="조리 특이사항 등" />
        {/* 색상 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:4}}>색상</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {RECIPE_COLORS.map(c=>(
              <div key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                style={{width:28,height:28,borderRadius:50,background:c,cursor:"pointer",border:form.color===c?"3px solid #333":"3px solid transparent"}} />
            ))}
          </div>
        </div>
        {/* 재료 */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:12,color:"#888"}}>재료 & 큐브 수</div>
            <button onClick={addIng} style={{background:"#f0f0f0",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>+ 추가</button>
          </div>
          {form.ingredients.map((ing,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <IngSearch value={ing.name} onChange={v=>setIng(i,"name",v)} cubes={cubes} />
              <input value={ing.cubeCount} onChange={e=>setIng(i,"cubeCount",e.target.value)} type="number" min="1"
                style={{width:50,padding:"8px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,outline:"none",background:"#fafafa",textAlign:"center"}} />
              <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>개</span>
              {form.ingredients.length>1&&(
                <button onClick={()=>delIng(i)} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"#e87",flexShrink:0}}>✕</button>
              )}
            </div>
          ))}
        </div>
        <PillBtn onClick={save} full disabled={!form.name||!form.ingredients.some(x=>x.name.trim())}>저장</PillBtn>
      </Overlay>
      <ConfirmDelete
        open={!!confirmDel}
        message={confirmDel?`"${confirmDel.name}" 유닛 레시피를 삭제할까요?`:""}
        onConfirm={()=>{setUnitRecipes(rs=>rs.filter(x=>x.id!==confirmDel.id));setConfirmDel(null);}}
        onCancel={()=>setConfirmDel(null)}
      />
    </div>
  );
}

// ────────────────────────────
// 예방접종 기초 데이터 (한국 국가예방접종 표준 일정)
// ────────────────────────────
const VACC_SCHEDULE = [
  { name:"B형간염", abbr:"HepB", doses:[
    { dose:1, monthMin:0, monthMax:0, label:"출생 시" },
    { dose:2, monthMin:1, monthMax:2, label:"1~2개월" },
    { dose:3, monthMin:6, monthMax:18, label:"6~18개월" },
  ]},
  { name:"BCG (결핵)", abbr:"BCG", doses:[
    { dose:1, monthMin:0, monthMax:1, label:"생후 4주 이내" },
  ]},
  { name:"DTaP (디프테리아/파상풍/백일해)", abbr:"DTaP", doses:[
    { dose:1, monthMin:2, monthMax:2, label:"2개월" },
    { dose:2, monthMin:4, monthMax:4, label:"4개월" },
    { dose:3, monthMin:6, monthMax:6, label:"6개월" },
    { dose:4, monthMin:15, monthMax:18, label:"15~18개월" },
    { dose:5, monthMin:48, monthMax:84, label:"4~6세" },
  ]},
  { name:"IPV (폴리오)", abbr:"IPV", doses:[
    { dose:1, monthMin:2, monthMax:2, label:"2개월" },
    { dose:2, monthMin:4, monthMax:4, label:"4개월" },
    { dose:3, monthMin:6, monthMax:18, label:"6~18개월" },
    { dose:4, monthMin:48, monthMax:84, label:"4~6세" },
  ]},
  { name:"Hib (뇌수막염)", abbr:"Hib", doses:[
    { dose:1, monthMin:2, monthMax:2, label:"2개월" },
    { dose:2, monthMin:4, monthMax:4, label:"4개월" },
    { dose:3, monthMin:6, monthMax:6, label:"6개월" },
    { dose:4, monthMin:12, monthMax:15, label:"12~15개월" },
  ]},
  { name:"PCV (폐렴구균)", abbr:"PCV", doses:[
    { dose:1, monthMin:2, monthMax:2, label:"2개월" },
    { dose:2, monthMin:4, monthMax:4, label:"4개월" },
    { dose:3, monthMin:6, monthMax:6, label:"6개월" },
    { dose:4, monthMin:12, monthMax:15, label:"12~15개월" },
  ]},
  { name:"MMR (홍역/유행성이하선염/풍진)", abbr:"MMR", doses:[
    { dose:1, monthMin:12, monthMax:15, label:"12~15개월" },
    { dose:2, monthMin:48, monthMax:84, label:"4~6세" },
  ]},
  { name:"수두", abbr:"VAR", doses:[
    { dose:1, monthMin:12, monthMax:15, label:"12~15개월" },
  ]},
  { name:"A형간염", abbr:"HepA", doses:[
    { dose:1, monthMin:12, monthMax:23, label:"12~23개월" },
    { dose:2, monthMin:18, monthMax:36, label:"18~36개월 (1차 후 6~18개월)" },
  ]},
  { name:"일본뇌염 (사백신)", abbr:"JEV", doses:[
    { dose:1, monthMin:12, monthMax:23, label:"12~23개월" },
    { dose:2, monthMin:13, monthMax:24, label:"1차 후 1~2주" },
    { dose:3, monthMin:24, monthMax:35, label:"2차 후 12개월" },
    { dose:4, monthMin:72, monthMax:84, label:"만 6세" },
    { dose:5, monthMin:132, monthMax:144, label:"만 12세" },
  ]},
  { name:"독감 (인플루엔자)", abbr:"Flu", doses:[
    { dose:1, monthMin:6, monthMax:6, label:"6개월 (매년)" },
  ]},
  { name:"Td (파상풍/디프테리아)", abbr:"Td", doses:[
    { dose:1, monthMin:132, monthMax:144, label:"만 11~12세" },
  ]},
];

const VACC_COLORS = {
  HepB:"#74B5F5", BCG:"#B5A4F5", DTaP:"#E78F8F", IPV:"#F4A261",
  Hib:"#7BC67E", PCV:"#F5D07A", MMR:"#7ADAD5", VAR:"#FFB347",
  HepA:"#F8C8C8", JEV:"#B0E8D0", Flu:"#C8E8FF", Td:"#E8C8F8",
};

// 생년월일 기준으로 접종 권장 날짜 범위 계산