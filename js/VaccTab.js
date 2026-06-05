const { useState, useEffect, useCallback, useMemo } = React;

function calcVaccDates(birthStr) {
  if (!birthStr) return [];
  const birth = new Date(birthStr);
  const result = [];
  VACC_SCHEDULE.forEach(vacc => {
    vacc.doses.forEach(dose => {
      const dMin = new Date(birth);
      dMin.setMonth(dMin.getMonth() + dose.monthMin);
      const dMax = new Date(birth);
      dMax.setMonth(dMax.getMonth() + dose.monthMax);
      // monthMax가 같으면 말일까지
      if (dose.monthMin === dose.monthMax) {
        dMax.setMonth(dMax.getMonth() + 1);
        dMax.setDate(dMax.getDate() - 1);
      }
      result.push({
        id: vacc.abbr + "_" + dose.dose,
        name: vacc.name,
        abbr: vacc.abbr,
        dose: dose.dose,
        totalDoses: vacc.doses.length,
        label: dose.label,
        dateMin: dMin.toISOString().slice(0,10),
        dateMax: dMax.toISOString().slice(0,10),
        color: VACC_COLORS[vacc.abbr] || "#e0e0e0",
      });
    });
  });
  return result;
}

// ────────────────────────────
// 예방접종 탭
// ────────────────────────────
function VaccTab({ vaccData, setVaccData }) {
  const birth = vaccData.birth || "";
  const appointments = vaccData.appointments || [];
  const [vaccConfirmDel, setVaccConfirmDel] = useState(null); // [{id, vaccId, date, memo, done}]
  const customVaccs = vaccData.customVaccs || []; // [{id, name, abbr, doses:[{dose,date,memo,done}]}]

  const [editBirth, setEditBirth] = useState(false);
  const [birthInput, setBirthInput] = useState(birth);
  const [apptModal, setApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({vaccId:"", date:"", memo:""});
  const [customModal, setCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({name:"", abbr:""});
  const [doneFilter, setDoneFilter] = useState("all"); // all, todo, done

  const vaccDates = calcVaccDates(birth);

  const saveBirth = () => {
    setVaccData(v => ({...v, birth: birthInput}));
    setEditBirth(false);
  };

  // 각 접종 항목의 상태 계산
  const getAppt = (vaccId) => appointments.find(a => a.vaccId === vaccId);
  const isDone = (vaccId) => {
    const a = getAppt(vaccId);
    return a && a.done;
  };

  const openAppt = (vaccId) => {
    const a = getAppt(vaccId);
    setApptForm({ vaccId, date: a ? a.date : "", memo: a ? a.memo : "" });
    setApptModal(true);
  };
  const saveAppt = () => {
    if (!apptForm.vaccId) return;
    setVaccData(v => {
      const appts = (v.appointments||[]).filter(a => a.vaccId !== apptForm.vaccId);
      if (apptForm.date) {
        appts.push({ id: uid(), vaccId: apptForm.vaccId, date: apptForm.date, memo: apptForm.memo, done: false });
      }
      return {...v, appointments: appts};
    });
    setApptModal(false);
  };
  const toggleDone = (vaccId, doneDate) => {
    setVaccData(v => {
      const existing = (v.appointments||[]).find(a => a.vaccId === vaccId);
      if (existing) {
        // 이미 appointment 있으면 done 토글
        const appts = (v.appointments||[]).map(a =>
          a.vaccId === vaccId ? {...a, done: !a.done, date: a.date || doneDate || todayStr()} : a
        );
        return {...v, appointments: appts};
      } else {
        // appointment 없으면 오늘 날짜로 완료 생성
        const appts = [...(v.appointments||[]), {id:uid(), vaccId, date: doneDate || todayStr(), memo:"", done:true}];
        return {...v, appointments: appts};
      }
    });
  };
  // 완료 처리 모달
  const openDoneModal = (vaccId) => {
    const a = getAppt(vaccId);
    setApptForm({ vaccId, date: a ? a.date : todayStr(), memo: a ? a.memo : "", isDoneMode: true });
    setApptModal(true);
  };

  // 오늘 기준 상태 분류
  const today = todayStr();
  const getStatus = (item) => {
    if (isDone(item.id)) return "done";
    const appt = getAppt(item.id);
    if (appt && appt.date) {
      if (appt.date < today) return "overdue";
      if (appt.date <= item.dateMax) return "scheduled";
      return "scheduled";
    }
    if (item.dateMax < today) return "overdue";
    if (item.dateMin <= today) return "due"; // 접종 기간 내
    return "upcoming";
  };
  const STATUS_LABEL = { done:"✅ 완료", scheduled:"📅 예약됨", due:"💉 접종 시기!", overdue:"⚠️ 미접종", upcoming:"⏳ 예정" };
  const STATUS_COLOR = { done:"#7BC67E", scheduled:"#74B5F5", due:"#F4A261", overdue:"#E78F8F", upcoming:"#bbb" };

  const filtered = vaccDates.filter(item => {
    if (doneFilter === "done") return isDone(item.id);
    if (doneFilter === "todo") return !isDone(item.id);
    return true;
  }).sort((a, b) => {
    const aDone = isDone(a.id), bDone = isDone(b.id);
    // 완료된 항목은 뒤로
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    // 미완료끼리는 dateMin 오름차순 (태어난 날부터 가까운 순)
    if (a.dateMin < b.dateMin) return -1;
    if (a.dateMin > b.dateMin) return 1;
    return 0;
  });

  const dueCount = vaccDates.filter(v => getStatus(v) === "due").length;
  const overdueCount = vaccDates.filter(v => getStatus(v) === "overdue").length;
  const scheduledCount = vaccDates.filter(v => getStatus(v) === "scheduled" && !isDone(v.id)).length;

  return (
    <div>
      {/* 생년월일 설정 */}
      <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,0.04)",border:"1.5px solid #f0f0f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#333",marginBottom:2}}>👶 이든이 생년월일</div>
            {birth
              ? <div style={{fontSize:13,color:"#555"}}>{fmtFull(birth)} <span style={{fontSize:11,color:"#7BC67E",fontWeight:600}}>({Math.floor((new Date()-new Date(birth))/(1000*60*60*24*30.5))}개월)</span></div>
              : <div style={{fontSize:12,color:"#bbb"}}>생년월일을 입력하면 접종 일정이 자동 계산돼요</div>
            }
          </div>
          <button onClick={()=>{setBirthInput(birth);setEditBirth(true);}} style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontSize:12,color:"#666"}}>
            {birth?"수정":"입력"}
          </button>
        </div>
        {editBirth && (
          <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
            <input type="date" value={birthInput} onChange={e=>setBirthInput(e.target.value)}
              style={{flex:1,padding:"9px 12px",border:"1.5px solid #7BC67E",borderRadius:10,fontSize:14,outline:"none"}} />
            <PillBtn onClick={saveBirth} small disabled={!birthInput}>저장</PillBtn>
            <button onClick={()=>setEditBirth(false)} style={{background:"#f0f0f0",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:12,color:"#888"}}>취소</button>
          </div>
        )}
      </div>

      {/* 요약 배너 */}
      {birth && (overdueCount > 0 || dueCount > 0 || scheduledCount > 0) && (
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {overdueCount > 0 && (
            <div style={{flex:1,minWidth:80,background:"#fff0f0",border:"1.5px solid #E78F8F",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:20,color:"#E78F8F"}}>{overdueCount}</div>
              <div style={{fontSize:11,color:"#e55"}}>⚠️ 미접종</div>
            </div>
          )}
          {dueCount > 0 && (
            <div style={{flex:1,minWidth:80,background:"#fff8f0",border:"1.5px solid #F4A261",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:20,color:"#F4A261"}}>{dueCount}</div>
              <div style={{fontSize:11,color:"#e8a"}}>💉 접종 시기</div>
            </div>
          )}
          {scheduledCount > 0 && (
            <div style={{flex:1,minWidth:80,background:"#f0f6ff",border:"1.5px solid #74B5F5",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:20,color:"#74B5F5"}}>{scheduledCount}</div>
              <div style={{fontSize:11,color:"#48a"}}>📅 예약됨</div>
            </div>
          )}
        </div>
      )}

      {/* 필터 */}
      {birth && (
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {[["all","전체"],["todo","미완료"],["done","완료"]].map(([v,l])=>(
            <button key={v} onClick={()=>setDoneFilter(v)}
              style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(doneFilter===v?"#7BC67E":"#e0e0e0"),background:doneFilter===v?"#7BC67E22":"#fff",color:doneFilter===v?"#4a9":"#888",fontSize:12,cursor:"pointer",fontWeight:doneFilter===v?700:400}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* 접종 목록 */}
      {!birth ? (
        <div style={{textAlign:"center",padding:"40px 0",color:"#bbb"}}>
          <div style={{fontSize:40,marginBottom:8}}>💉</div>
          <div style={{fontSize:14}}>생년월일을 입력하면<br/>접종 일정이 자동으로 나와요</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(item => {
            const status = getStatus(item);
            const appt = getAppt(item.id);
            const done = isDone(item.id);
            return (
              <div key={item.id} style={{background:done?"#f9f9f9":"#fff",borderRadius:14,padding:"12px 14px",border:"1.5px solid "+(done?"#e8e8e8":STATUS_COLOR[status]+"66"),opacity:done?0.7:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{background:item.color+"33",border:"1px solid "+item.color+"88",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,color:"#555"}}>{item.abbr}</span>
                      <span style={{fontWeight:700,fontSize:13,color:done?"#aaa":"#333"}}>{item.name}</span>
                      {item.totalDoses > 1 && <span style={{fontSize:11,color:"#aaa"}}>{item.dose}차/{item.totalDoses}차</span>}
                    </div>
                    {!done && <div style={{fontSize:12,color:"#888",marginBottom:4}}>📅 권장: {item.label}<br/><span style={{fontSize:11}}>({item.dateMin} ~ {item.dateMax})</span></div>}
                    {appt && appt.date && !done && (
                      <div style={{fontSize:12,color:"#74B5F5",fontWeight:600}}>🏥 예약일: {appt.date}{appt.memo&&" · "+appt.memo}</div>
                    )}
                    {done && (
                      <div style={{fontSize:12,color:"#7BC67E",fontWeight:600}}>
                        ✅ 접종 완료{appt&&appt.date?" · "+appt.date:""}
                        {appt&&appt.memo&&<span style={{fontSize:11,color:"#aaa",fontWeight:400}}> · {appt.memo}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0,alignItems:"flex-end"}}>
                    <span style={{fontSize:10,fontWeight:700,color:STATUS_COLOR[status],background:STATUS_COLOR[status]+"22",borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>
                      {STATUS_LABEL[status]}
                    </span>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {!done ? (
                        <>
                          <button onClick={()=>openAppt(item.id)}
                            style={{background:"#f0f6ff",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#48a"}}>
                            {appt&&appt.date?"📅 예약수정":"📅 예약"}
                          </button>
                          <button onClick={()=>openDoneModal(item.id)}
                            style={{background:"#e8f8f0",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#4a9",fontWeight:600}}>
                            ✅ 완료
                          </button>
                        </>
                      ) : (
                        <button onClick={()=>toggleDone(item.id)}
                          style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#aaa"}}>
                          완료 취소
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 직접 추가 버튼 */}
          <div style={{marginTop:8}}>
            <button onClick={()=>{setCustomForm({name:"",abbr:""});setCustomModal(true);}}
              style={{width:"100%",padding:"12px",border:"2px dashed #e0e0e0",borderRadius:14,background:"transparent",cursor:"pointer",fontSize:13,color:"#aaa",fontWeight:600}}>
              + 접종 항목 직접 추가
            </button>
          </div>

          {/* 커스텀 접종 항목 */}
          {(vaccData.customVaccs||[]).map(cv => (
            <div key={cv.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",border:"1.5px solid #e0e0e0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontWeight:700,fontSize:13,color:"#333"}}>{cv.name}</span>
                  {cv.date && <div style={{fontSize:12,color:"#74B5F5",marginTop:2}}>📅 {cv.date}{cv.memo&&" · "+cv.memo}</div>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>{setCustomForm({...cv,editing:true});setCustomModal(true);}} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#666"}}>수정</button>
                  <button onClick={()=>setVaccConfirmDel({id:cv.id,name:cv.name})} style={{background:"#ffeaea",border:"none",borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"#e87"}}>삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 날짜 지정 모달 */}
      <Overlay open={apptModal} onClose={()=>setApptModal(false)}
        title={apptForm.isDoneMode ? "✅ 접종 완료 처리" : "📅 접종 예약 일정 지정"}>
        {(()=>{
          const item = vaccDates.find(v=>v.id===apptForm.vaccId);
          if (!item) return null;
          const isDoneMode = apptForm.isDoneMode;
          return (
            <div>
              <div style={{background:item.color+"22",borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:13,color:"#555"}}>
                <strong>{item.name}</strong> {item.totalDoses>1?" "+item.dose+"차/"+item.totalDoses+"차":""}<br/>
                <span style={{fontSize:11,color:"#888"}}>권장 시기: {item.label}</span>
              </div>
              {isDoneMode ? (
                <>
                  <div style={{background:"#e8f8f0",border:"1px solid #7BC67E44",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#4a9"}}>
                    이미 접종한 날짜를 입력하면 완료로 처리돼요 🎉
                  </div>
                  <Field label="접종일 (선택)" value={apptForm.date} onChange={v=>setApptForm(f=>({...f,date:v}))} type="date" />
                  <Field label="메모 (병원명 등)" value={apptForm.memo} onChange={v=>setApptForm(f=>({...f,memo:v}))} placeholder="소아과, 특이사항 등" />
                  <PillBtn onClick={()=>{
                    setVaccData(v => {
                      const existing = (v.appointments||[]).find(a=>a.vaccId===apptForm.vaccId);
                      if (existing) {
                        const appts = (v.appointments||[]).map(a=>a.vaccId===apptForm.vaccId?{...a,date:apptForm.date||todayStr(),memo:apptForm.memo,done:true}:a);
                        return {...v, appointments:appts};
                      } else {
                        return {...v, appointments:[...(v.appointments||[]),{id:uid(),vaccId:apptForm.vaccId,date:apptForm.date||todayStr(),memo:apptForm.memo,done:true}]};
                      }
                    });
                    setApptModal(false);
                  }} full color="#7BC67E">✅ 완료로 저장</PillBtn>
                </>
              ) : (
                <>
                  <div style={{background:"#f0f6ff",border:"1px solid #74B5F544",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#48a"}}>
                    병원에서 확정된 예약일을 입력해주세요 📅
                  </div>
                  <Field label="접종 예약일" value={apptForm.date} onChange={v=>setApptForm(f=>({...f,date:v}))} type="date" />
                  <Field label="메모 (병원명 등)" value={apptForm.memo} onChange={v=>setApptForm(f=>({...f,memo:v}))} placeholder="소아과 예약, 오전 10시 등" />
                  <div style={{display:"flex",gap:8}}>
                    {getAppt(apptForm.vaccId)?.date && (
                      <PillBtn onClick={()=>{setVaccData(v=>({...v,appointments:(v.appointments||[]).filter(a=>a.vaccId!==apptForm.vaccId)}));setApptModal(false);}} color="#E78F8F" outline small>예약삭제</PillBtn>
                    )}
                    <div style={{flex:1}}><PillBtn onClick={saveAppt} full disabled={!apptForm.date}>예약 저장</PillBtn></div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Overlay>

      {/* 직접 추가 모달 */}
      <Overlay open={customModal} onClose={()=>setCustomModal(false)} title="접종 항목 직접 추가">
        <Field label="접종명" value={customForm.name} onChange={v=>setCustomForm(f=>({...f,name:v}))} placeholder="로타바이러스 등" />
        <Field label="날짜" value={customForm.date||""} onChange={v=>setCustomForm(f=>({...f,date:v}))} type="date" />
        <Field label="메모" value={customForm.memo||""} onChange={v=>setCustomForm(f=>({...f,memo:v}))} placeholder="병원명, 특이사항 등" />
        <PillBtn onClick={()=>{
          if (!customForm.name.trim()) return;
          if (customForm.editing) {
            setVaccData(v=>({...v,customVaccs:(v.customVaccs||[]).map(x=>x.id===customForm.id?{...x,...customForm}:x)}));
          } else {
            setVaccData(v=>({...v,customVaccs:[...(v.customVaccs||[]),{id:uid(),name:customForm.name,date:customForm.date||"",memo:customForm.memo||""}]}));
          }
          setCustomModal(false);
        }} full disabled={!customForm.name.trim()}>저장</PillBtn>
      </Overlay>
      <ConfirmDelete
        open={!!vaccConfirmDel}
        message={vaccConfirmDel ? `"${vaccConfirmDel.name}" 접종 항목을 삭제할까요?` : ""}
        onConfirm={()=>{ setVaccData(v=>({...v,customVaccs:(v.customVaccs||[]).filter(x=>x.id!==vaccConfirmDel.id)})); setVaccConfirmDel(null); }}
        onCancel={()=>setVaccConfirmDel(null)}
      />
    </div>
  );
}

