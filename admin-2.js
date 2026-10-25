function MenuPage({outlets,outletId,notify,isAdmin}){
  const [prods,setProds]=useState([]),[avail,setAvail]=useState({}),[cats,setCats]=useState([]),[nw,setNw]=useState({name:"",price:"",emoji:"☕",category_id:""});
  const oid=outletId!=="all"?outletId:outlets[0]?.id;
  const load=useCallback(async()=>{
    const {data:p}=await sb.from("products").select("*").order("name");setProds(p||[]);
    const {data:c}=await sb.from("categories").select("*").order("sort_order");setCats(c||[]);
    if(oid){const {data:a}=await sb.from("outlet_products").select("*").eq("outlet_id",oid);const m={};(a||[]).forEach(x=>m[x.product_id]=x.is_available);setAvail(m)}
  },[oid]);
  useEffect(()=>{load()},[load]);
  async function toggle(p){const v=!(avail[p.id]!==false);const {error}=await sb.from("outlet_products").upsert({outlet_id:oid,product_id:p.id,is_available:!v},{onConflict:"outlet_id,product_id"});error?notify(error.message,"err"):load()}
  async function price(p,val){const n=parseInt(val);if(!n||n===p.price)return;const {error}=await sb.from("products").update({price:n}).eq("id",p.id);error?notify(error.message,"err"):(notify("Harga diperbarui"),load())}
  async function add(){if(!nw.name||!nw.price)return notify("Isi nama dan harga","err");
    const {data,error}=await sb.from("products").insert({name:nw.name,price:parseInt(nw.price),emoji:nw.emoji||"☕",category_id:nw.category_id||null}).select().single();
    if(error)return notify(error.message,"err");
    await sb.from("outlet_products").insert(outlets.map(o=>({outlet_id:o.id,product_id:data.id})));
    setNw({name:"",price:"",emoji:"☕",category_id:""});notify("Produk ditambahkan");load()}
  return <div className="space-y-3">
    <div className="text-sm text-slate-500">Ketersediaan untuk: <b>{outlets.find(o=>o.id===oid)?.name}</b></div>
    {isAdmin&&<div className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 md:grid-cols-5"><input className={inp} placeholder="Nama produk" value={nw.name} onChange={e=>setNw({...nw,name:e.target.value})}/><input className={inp} placeholder="Harga" inputMode="numeric" value={nw.price} onChange={e=>setNw({...nw,price:e.target.value})}/><input className={inp} placeholder="Emoji" value={nw.emoji} onChange={e=>setNw({...nw,emoji:e.target.value})}/>
      <select className={inp} value={nw.category_id} onChange={e=>setNw({...nw,category_id:e.target.value})}><option value="">Kategori</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={add} className="rounded-xl bg-amber-800 py-2.5 font-bold text-white">+ Tambah</button></div>}
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">{prods.map(p=>{const on=avail[p.id]!==false;return <div key={p.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <span className="text-2xl">{p.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div>
      {isAdmin?<input defaultValue={p.price} key={p.price} onBlur={e=>price(p,e.target.value)} className="mt-0.5 w-28 rounded border border-slate-200 px-2 py-0.5 text-xs" inputMode="numeric"/>:<div className="text-xs text-slate-500">{rp(p.price)}</div>}</div>
      <button onClick={()=>toggle(p)} className={`rounded-full px-3 py-1 text-xs font-bold ${on?"bg-emerald-100 text-emerald-700":"bg-rose-100 text-rose-700"}`}>{on?"Tersedia":"Habis"}</button></div>})}</div></div>;
}

function Users({outlets,notify}){
  const [list,setList]=useState([]),[q,setQ]=useState("");
  const load=useCallback(async()=>{const {data}=await sb.from("profiles").select("*").order("created_at",{ascending:false}).limit(100);setList(data||[])},[]);
  useEffect(()=>{load()},[load]);
  async function upd(u,patch){const {error}=await sb.from("profiles").update(patch).eq("id",u.id);error?notify(error.message,"err"):(notify("Tersimpan"),load())}
  const shown=list.filter(u=>((u.email||"")+(u.full_name||"")).toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-3"><input className={inp} placeholder="Cari nama atau email" value={q} onChange={e=>setQ(e.target.value)}/>
    <p className="text-xs text-slate-500">Atur peran staf di sini. Staf (kasir/manajer) wajib dipasangkan ke satu outlet.</p>
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">{shown.map(u=><div key={u.id} className="grid items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0 md:grid-cols-3">
      <div className="min-w-0"><div className="truncate text-sm font-semibold">{u.full_name||"-"}</div><div className="truncate text-xs text-slate-500">{u.email}</div></div>
      <select className={inp} value={u.role} onChange={e=>upd(u,{role:e.target.value})}>{["customer","cashier","manager","owner"].map(r=><option key={r} value={r}>{r}</option>)}</select>
      <select className={inp} value={u.outlet_id||""} onChange={e=>upd(u,{outlet_id:e.target.value||null})}><option value="">(semua / tidak ada)</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>)}</div></div>;
}

function App(){
  const [user,setUser]=useState(null),[me,setMe]=useState(null),[ready,setReady]=useState(false),[tab,setTab]=useState("orders"),[outlets,setOutlets]=useState([]),[outletId,setOutletId]=useState("all"),[orders,setOrders]=useState([]),[names,setNames]=useState({}),[toast,setToast]=useState(null);
  const userRef=useRef(null);
  const notify=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)};

  const boot=useCallback(async()=>{
    try {
      const {data:{session}}=await sb.auth.getSession();
      if(!session){userRef.current=null;setUser(null);setMe(null);setReady(true);return}
      const {data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
      const first=!userRef.current;
      userRef.current=session.user.id;
      setUser(session.user);setMe(p);setReady(true);
      if(first){
        if(p&&p.role!=="owner"&&p.outlet_id)setOutletId(p.outlet_id);
        setTab(p&&["owner","manager"].includes(p.role)?"overview":"orders");
      }
    } catch(e) {
      console.error(e);
      setReady(true);
    }
  },[]);

  useEffect(()=>{
    boot();
    const {data}=sb.auth.onAuthStateChange((e)=>{
      if(e==="SIGNED_OUT"){userRef.current=null;setUser(null);setMe(null)}
      else if(e==="SIGNED_IN"&&!userRef.current){setTimeout(boot,0)}
    });
    return()=>data.subscription.unsubscribe();
  },[boot]);

  const isStaff=!!me&&["owner","manager","cashier"].includes(me.role);
  const isAdmin=!!me&&["owner","manager"].includes(me.role);
  const isOwner=!!me&&me.role==="owner";

  const loadOrders=useCallback(async()=>{
    let q=sb.from("orders").select("*, order_items(*), outlets(name)").order("created_at",{ascending:false}).limit(300);
    if(outletId!=="all")q=q.eq("outlet_id",outletId);
    const {data,error}=await q;
    if(error){notify(error.message,"err");return}
    setOrders(data||[]);
    const ids=[...new Set((data||[]).map(o=>o.user_id).filter(Boolean))];
    if(ids.length){
      const {data:ps}=await sb.from("profiles").select("id,full_name,phone").in("id",ids);
      const m={};(ps||[]).forEach(p=>m[p.id]=p);setNames(m);
    }
  },[outletId]);
  const loadRef=useRef(loadOrders);
  useEffect(()=>{loadRef.current=loadOrders},[loadOrders]);

  useEffect(()=>{
    if(!isStaff)return;
    sb.from("outlets").select("*").order("name").then(({data})=>setOutlets(data||[]));
  },[isStaff]);

  useEffect(()=>{if(isStaff)loadOrders()},[isStaff,loadOrders]);

  useEffect(()=>{
    if(!isStaff)return;
    const ch=sb.channel("orders-live").on("postgres_changes",{event:"*",schema:"public",table:"orders"},(p)=>{
      if(p.eventType==="INSERT"||(p.eventType==="UPDATE"&&p.new?.status==="received"&&p.old?.status!=="received")){beep();notify("Pesanan baru masuk")}
      loadRef.current();
    }).subscribe();
    return()=>{sb.removeChannel(ch)};
  },[isStaff]);

  async function logout(){await sb.auth.signOut();userRef.current=null;setUser(null);setMe(null);setOrders([])}

  if(!ready)return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>;
  if(!user)return <Login onDone={boot}/>;
  if(!isStaff)return <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-4xl">☕</div><div className="font-bold">Akun ini bukan staf KopiKita.</div><button onClick={logout} className="rounded-xl bg-amber-800 px-5 py-2 font-bold text-white">Keluar</button></div>;

  const tabs=[...(isAdmin?[["overview","Ringkasan"]]:[]),["orders","Pesanan"],["menu","Menu"],...(isOwner?[["users","Pengguna"]]:[])];
  const canPickOutlet=me.role==="owner";

  return <div className="mx-auto max-w-6xl p-3 md:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><div className="text-lg font-extrabold">☕ KopiKita {isAdmin?"Admin":"Kasir"}</div><div className="text-xs text-slate-500">{me.full_name||user.email} · {me.role}</div></div>
      <div className="flex items-center gap-2">
        {canPickOutlet&&<select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={outletId} onChange={e=>setOutletId(e.target.value)}><option value="all">Semua outlet</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}
        <button onClick={logout} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200">Keluar</button>
      </div>
    </div>
    <div className="mb-4 flex gap-2 overflow-x-auto">{tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold ${tab===k?"bg-amber-800 text-white":"bg-white ring-1 ring-slate-200"}`}>{l}</button>)}</div>
    {tab==="overview"&&isAdmin&&<Overview orders={orders}/>}
    {tab==="orders"&&<Orders orders={orders} names={names} reload={loadOrders} notify={notify}/>}
    {tab==="menu"&&<MenuPage outlets={outlets} outletId={outletId} notify={notify} isAdmin={isAdmin}/>}
    {tab==="users"&&isOwner&&<Users outlets={outlets} notify={notify}/>}
    {toast&&<div className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg ${toast.type==="err"?"bg-rose-600":"bg-slate-900"}`}>{toast.msg}</div>}
  </div>;
}

class EB extends React.Component{
  constructor(p){super(p);this.state={e:null}}
  static getDerivedStateFromError(e){return{e}}
  render(){return this.state.e?<pre style={{whiteSpace:"pre-wrap",padding:16,color:"#b91c1c",fontSize:12}}>{"Error: "+String(this.state.e.stack||this.state.e.message||this.state.e)}</pre>:this.props.children}
}
ReactDOM.createRoot(document.getElementById("root")).render(<EB><App/></EB>);
