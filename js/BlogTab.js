(function() {
  const CATEGORY_COLORS = {
    "이유식": "#7BC67E",
    "육아":   "#74B5F5",
    "건강":   "#F4A261",
    "레시피": "#E78F8F",
    "성장":   "#C8A8E9",
  };
  const CATEGORY_ICONS = {
    "이유식": "🥣",
    "육아":   "👶",
    "건강":   "💊",
    "레시피": "🍳",
    "성장":   "📏",
  };

  function BlogTab() {
    const [posts, setPosts] = React.useState([]);
    const [search, setSearch] = React.useState("");
    const [filterCat, setFilterCat] = React.useState("전체");

    React.useEffect(() => {
      setPosts(window.BLOG_POSTS || []);
    }, []);

    const categories = ["전체", ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))];

    const filtered = posts.filter(p => {
      const matchCat = filterCat === "전체" || p.category === filterCat;
      const matchSearch = !search.trim() || p.title.includes(search.trim()) || (p.desc || "").includes(search.trim());
      return matchCat && matchSearch;
    });

    const fmtDate = (str) => {
      if (!str) return "";
      const [y, m, d] = str.split("-");
      return `${y}.${m}.${d}`;
    };

    if (posts.length === 0) return (
      <div style={{textAlign:"center", padding:40, color:"#bbb"}}>
        <div style={{fontSize:32, marginBottom:8}}>📝</div>
        <div style={{fontSize:13}}>글을 불러오는 중...</div>
      </div>
    );

    return (
      <div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div>
            <div style={{fontWeight:800, fontSize:17, color:"#333"}}>📖 이든파파 블로그</div>
            <div style={{fontSize:11, color:"#aaa", marginTop:2}}>육아 정보 & 이유식 레시피</div>
          </div>
          <a href="https://ednpapa.co.kr" target="_blank" rel="noreferrer"
            style={{fontSize:11, color:"#7BC67E", fontWeight:700, textDecoration:"none", background:"#e8f8f0", borderRadius:20, padding:"4px 10px"}}>
            블로그 전체 →
          </a>
        </div>

        <div style={{position:"relative", marginBottom:10}}>
          <span style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#bbb"}}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="글 제목 검색..."
            style={{width:"100%", padding:"9px 12px 9px 34px", border:"1.5px solid #e8e8e8", borderRadius:12, fontSize:13, outline:"none", background:"#fafafa", boxSizing:"border-box"}} />
          {search && <button onClick={() => setSearch("")}
            style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:14}}>✕</button>}
        </div>

        <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:14}}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              style={{padding:"4px 12px", borderRadius:20,
                border:"1.5px solid "+(filterCat===cat?(CATEGORY_COLORS[cat]||"#7BC67E"):"#e0e0e0"),
                background:filterCat===cat?(CATEGORY_COLORS[cat]||"#7BC67E")+"22":"#fff",
                color:filterCat===cat?(CATEGORY_COLORS[cat]||"#4a9"):"#888",
                fontWeight:filterCat===cat?700:400, fontSize:12, cursor:"pointer"}}>
              {CATEGORY_ICONS[cat] || ""} {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{textAlign:"center", padding:32, color:"#bbb", fontSize:13}}>검색 결과가 없습니다 🔍</div>
        )}

        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {filtered.map((post, i) => {
            const color = CATEGORY_COLORS[post.category] || "#aaa";
            const icon = CATEGORY_ICONS[post.category] || "📄";
            return (
              <a key={i} href={post.url} target="_blank" rel="noreferrer"
                style={{textDecoration:"none", display:"flex", gap:12, background:"#fff",
                  borderRadius:14, padding:14, border:"1.5px solid #f0f0f0",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.04)", alignItems:"center"}}>
                <div style={{width:52, height:52, borderRadius:12, background:color+"22",
                  flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24}}>
                  {icon}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:4}}>
                    <span style={{fontSize:10, background:color+"22", color:color,
                      border:"1px solid "+color+"55", borderRadius:20, padding:"1px 7px", fontWeight:600}}>
                      {post.category}
                    </span>
                    <span style={{fontSize:10, color:"#ccc"}}>{fmtDate(post.date)}</span>
                  </div>
                  <div style={{fontWeight:700, fontSize:13, color:"#333", lineHeight:1.4, marginBottom:3,
                    overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                    {post.title}
                  </div>
                  {post.desc && (
                    <div style={{fontSize:11, color:"#999", overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:1, WebkitBoxOrient:"vertical"}}>
                      {post.desc}
                    </div>
                  )}
                </div>
                <span style={{color:"#ccc", fontSize:18, flexShrink:0}}>›</span>
              </a>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div style={{textAlign:"center", marginTop:20}}>
            <a href="https://ednpapa.co.kr" target="_blank" rel="noreferrer"
              style={{display:"inline-block", fontSize:13, color:"#7BC67E", fontWeight:700,
                textDecoration:"none", background:"#e8f8f0", borderRadius:20, padding:"8px 20px"}}>
              블로그에서 더 보기 →
            </a>
          </div>
        )}
      </div>
    );
  }

  window.BlogTab = BlogTab;
})();
