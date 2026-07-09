(function() {
  function SettingTab({ babyName, setBabyName }) {
    const [editName, setEditName] = React.useState(babyName);
    const [saved, setSaved] = React.useState(false);

    const save = () => {
      if (!editName.trim()) return;
      setBabyName(editName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };

    return (
      <div>
        <div style={{fontWeight:800, fontSize:18, color:"#333", marginBottom:20}}>⚙️ 설정</div>

        <div style={{background:"#fff", borderRadius:16, padding:20, border:"1.5px solid #f0f0f0", marginBottom:16}}>
          <div style={{fontWeight:700, fontSize:14, color:"#555", marginBottom:12}}>👶 아이 이름</div>
          <div style={{display:"flex", gap:8}}>
            <input
              value={editName}
              onChange={e => { setEditName(e.target.value); setSaved(false); }}
              placeholder="아이 이름을 입력하세요"
              style={{flex:1, padding:"10px 14px", border:"1.5px solid #e0e0e0", borderRadius:12, fontSize:14, outline:"none"}}
            />
            <button onClick={save}
              style={{background:"#7BC67E", color:"#fff", border:"none", borderRadius:12, padding:"10px 18px", fontSize:14, fontWeight:700, cursor:"pointer"}}>
              저장
            </button>
          </div>
          {saved && <div style={{marginTop:8, fontSize:12, color:"#4a9", fontWeight:600}}>✓ 저장됐어요!</div>}
          <div style={{marginTop:8, fontSize:11, color:"#aaa"}}>헤더의 "{babyName}의 건강한 한 끼"에 반영됩니다.</div>
        </div>
      </div>
    );
  }

  window.SettingTab = SettingTab;
})();
