(function() {
  const CATEGORY_COLORS = {
    "이유식": "#7BC67E",
    "육아": "#74B5F5",
    "건강": "#F4A261",
    "레시피": "#E78F8F",
    "성장": "#C8A8E9",
  };

  function BlogTab() {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const [search, setSearch] = React.useState("");

    React.useEffect(() => {
      fetch("https://api.rss2json.com/v1/api.json?rss_url=https://ednpapa.co.kr/feed&count=30")
        .then(r => r.json())
        .then(data => {
          if (data.status === "ok") {
            setPosts(data.items || []);
          } else {
            setError(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }, []);

    const filtered = posts.filter(p =>
      !search.trim() || p.title.includes(search.trim()) || (p.categories || []).some(c => c.includes(search.trim()))
    );

    const fmtDate = (str) => {
      if (!str) return "";
      const d = new Date(str);
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
    };

    // 썸네일 추출
    const getThumbnail = (post) => {
      if (post.thumbnail && post.thumbnail.startsWith("http")) return post.thumbnail;
      const match = (post.content || "").match(/<img[^>]+src=["']([^"']+)["']/);
      return match ? match[1] : null;
    };

    if (loading) return (
      <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, color:"#aaa"}}>
        <div style={{fontSize:32, marginBottom:12}}>📖</div>
        <div style={{fontSize:14}}>블로그 글을 불러오는 중...</div>
      </div>
    );

    if (error) return (
      <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, color:"#aaa"}}>
        <div style={{fontSize:32, marginBottom:12}}>😥</div>
        <div style={{fontSize:14, marginBottom:8}}>글을 불러올 수 없어요</div>
        <div style={{fontSize:12, color:"#ccc"}}>인터넷 연결을 확인해주세요</div>
      </div>
    );

    return (
      <div>
        {/* 헤더 */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div>
            <div style={{fontWeight:800, fontSize:17, color:"#333"}}>📖 이든파파 블로그</div>
            <div style={{fontSize:11, color:"#aaa", marginTop:2}}>육아 정보 & 이유식 레시피</div>
          </div>
          <a href="https://ednpapa.co.kr" target="_blank" rel="noreferrer"
            style={{fontSize:11, color:"#7BC67E", fontWeight:700, textDecoration:"none", background:"#e8f8f0", borderRadius:20, padding:"4px 10px"}}>
            블로그 전체 보기 →
          </a>
        </div>

        {/* 검색 */}
        <div style={{position:"relative", marginBottom:14}}>
          <span style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#bbb"}}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="글 제목이나 카테고리 검색..."
            style={{width:"100%", padding:"9px 12px 9px 34px", border:"1.5px solid #e8e8e8", borderRadius:12, fontSize:13, outline:"none", background:"#fafafa", boxSizing:"border-box"}}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:14}}>✕</button>
          )}
        </div>

        {/* 글 목록 */}
        {filtered.length === 0 && (
          <div style={{textAlign:"center", padding:32, color:"#bbb", fontSize:13}}>검색 결과가 없습니다 🔍</div>
        )}
        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {filtered.map((post, i) => {
            const thumb = getThumbnail(post);
            const cats = post.categories || [];
            return (
              <a key={i} href={post.link} target="_blank" rel="noreferrer"
                style={{textDecoration:"none", display:"flex", gap:12, background:"#fff", borderRadius:14, padding:14, border:"1.5px solid #f0f0f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", alignItems:"flex-start"}}>
                {/* 썸네일 */}
                {thumb ? (
                  <img src={thumb} alt="" style={{width:72, height:72, borderRadius:10, objectFit:"cover", flexShrink:0, background:"#f0f0f0"}} />
                ) : (
                  <div style={{width:72, height:72, borderRadius:10, background:"linear-gradient(135deg,#7BC67E,#5BAD5E)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28}}>
                    🍼
                  </div>
                )}
                {/* 내용 */}
                <div style={{flex:1, minWidth:0}}>
                  {/* 카테고리 태그 */}
                  {cats.length > 0 && (
                    <div style={{display:"flex", flexWrap:"wrap", gap:4, marginBottom:5}}>
                      {cats.slice(0,2).map((cat, ci) => (
                        <span key={ci} style={{fontSize:10, background:(CATEGORY_COLORS[cat] || "#e0e0e0")+"22", color:(CATEGORY_COLORS[cat] || "#888"), border:"1px solid "+(CATEGORY_COLORS[cat] || "#ddd")+"55", borderRadius:20, padding:"1px 7px", fontWeight:600}}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 제목 */}
                  <div style={{fontWeight:700, fontSize:13, color:"#333", lineHeight:1.4, marginBottom:4,
                    overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                    {post.title}
                  </div>
                  {/* 날짜 */}
                  <div style={{fontSize:11, color:"#bbb"}}>{fmtDate(post.pubDate)}</div>
                </div>
                <span style={{color:"#ccc", fontSize:16, flexShrink:0, alignSelf:"center"}}>›</span>
              </a>
            );
          })}
        </div>

        {/* 하단 더보기 */}
        {filtered.length > 0 && (
          <div style={{textAlign:"center", marginTop:20}}>
            <a href="https://ednpapa.co.kr" target="_blank" rel="noreferrer"
              style={{display:"inline-block", fontSize:13, color:"#7BC67E", fontWeight:700, textDecoration:"none", background:"#e8f8f0", borderRadius:20, padding:"8px 20px"}}>
              더 많은 글 보기 →
            </a>
          </div>
        )}
      </div>
    );
  }

  window.BlogTab = BlogTab;
})();
