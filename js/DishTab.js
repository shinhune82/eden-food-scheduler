function DishTab({ dishes, setDishes }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({name:"",icon:"🍽️",slots:[""]});
  const DISH_ICONS = ["🍽️","⬜","🥣","🫙","🥗","🍲","🫕","🥡"];

  const [confirmDel, setConfirmDel] = useState(null);
  const openEdit = d => { setEditId(d.id); setForm({name:d.name,icon:d.icon,slots:[...d.slots]}); setModal(true); };
  const addSlot = () => setForm(f=>({...f,slots:[...f.slots,""]}));
  const delSlot = i => setForm(f=>({...f,slots:f.slots.filter((_,idx)=>idx!==i)}));
  const setSlot = (i,v) => setForm(f=>{const s=[...f.slots];s[i]=v;return {...f,slots:s};});
  const saveDish = () => {
    const slots = form.slots.map(s=>s.trim()).filter(Boolean);
    if (!form.name||!slots.length) return;
    if (editId) setDishes(ds=>ds.map(d=>d.id===editId?{...d,name:form.name,icon:form.icon,slots}:d));
    else setDishes(ds=>[...ds,{id:uid(),name:form.name,icon:form.icon,slots}]);
    setModal(false);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:700,fontSize:16,color:"#333"}}>식기 관리 ({dishes.length})</span>
        <PillBtn onClick={()=>{setEditId(null);setForm({name:"",icon:"🍽️",slots:[""]});setModal(true);}} small>+ 식기 추가</PillBtn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {dishes.map(d=>(
          <div key={d.id} style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 10px rgba(0,0,0,0.04)",border:"1.5px solid #f0f0f0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><span style={{fontSize:20,marginRight:8}}>{d.icon}</span><span style={{fontWeight:700,fontSize:15,color:"#333"}}>{d.name}</span></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>openEdit(d)} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>수정</button>
                <button onClick={()=>setConfirmDel({id:d.id,name:d.name})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#e87"}}>삭제</button>
              </div>
            </div>
            <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
              {d.slots.map((slot,i)=><span key={slot+i} style={{display:"inline-flex",alignItems:"center",background:SLOT_COLORS[i]+"88",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#555"}}>{slot}</span>)}
            </div>
          </div>
        ))}
      </div>
      <Overlay open={modal} onClose={()=>setModal(false)} title={editId?"식기 수정":"새 식기 추가"}>
        <Field label="식기 이름" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="타원형 식판" />
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"#888",marginBottom:6}}>아이콘</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {DISH_ICONS.map(ic=>(<div key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",border:"2px solid "+(form.icon===ic?"#7BC67E":"transparent"),background:form.icon===ic?"#7BC67E22":"#f5f5f5"}}>{ic}</div>))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:12,color:"#888"}}>칸 구성</div>
            <button onClick={addSlot} style={{background:"#f0f0f0",border:"none",borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:12,color:"#666"}}>+ 칸 추가</button>
          </div>
          {form.slots.map((slot,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
              <div style={{width:12,height:12,borderRadius:3,background:SLOT_COLORS[i],flexShrink:0}} />
              <input value={slot} onChange={e=>setSlot(i,e.target.value)} placeholder="칸 이름" style={{flex:1,padding:"8px 12px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:13,outline:"none",background:"#fafafa"}} />
              {form.slots.length>1 && <button onClick={()=>delSlot(i)} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"#e87"}}>✕</button>}
            </div>
          ))}
        </div>
        <PillBtn onClick={saveDish} full>저장</PillBtn>
      </Overlay>
      <ConfirmDelete
        open={!!confirmDel}
        message={confirmDel ? `"${confirmDel.name}" 식기를 삭제할까요?` : ""}
        onConfirm={()=>{ setDishes(ds=>ds.filter(x=>x.id!==confirmDel.id)); setConfirmDel(null); }}
        onCancel={()=>setConfirmDel(null)}
      />
    </div>
  );
}

// ────────────────────────────
// 앱 루트
// ────────────────────────────