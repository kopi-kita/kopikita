const {useState,useEffect,useRef,useCallback}=React;

const SUPABASE_URL="https://ykpywnjakthiybfiypjt.supabase.co";
const SUPABASE_KEY="sb_publishable_63kf6dpVYaa5eBXHlpIX7w_JJjpRzKc";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);


const rp=n=>"Rp"+Number(n||0).toLocaleString("id-ID");
const ST={pending_payment:"Menunggu bayar",received:"Baru masuk",preparing:"Diproses",ready:"Siap diambil",on_delivery:"Diantar",completed:"Selesai",cancelled:"Dibatalkan",expired:"Kedaluwarsa"};
const COLOR={received:"bg-blue-100 text-blue-700",preparing:"bg-amber-100 text-amber-700",ready:"bg-emerald-100 text-emerald-700",on_delivery:"bg-violet-100 text-violet-700",completed:"bg-slate-100 text-slate-600",cancelled:"bg-rose-100 text-rose-700",expired:"bg-rose-100 text-rose-700",pending_payment:"bg-slate-100 text-slate-600"};
const TYPE={pickup:"Pickup",delivery:"Delivery",dine_in:"Dine-in"};
const SALES=["received","preparing","ready","on_delivery","completed"];
const nextOf=o=>o.status==="received"?"preparing":o.status==="preparing"?(o.order_type==="delivery"?"on_delivery":"ready"):(o.status==="ready"||o.status==="on_delivery")?"completed":null;
const inp="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-amber-700";
const beep=()=>{try{const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator();o.frequency.value=880;o.connect(c.destination);o.start();setTimeout(()=>{o.stop();c.close()},250)}catch(e){}};

function Cht({type,data,options}){
  const r=useRef(null);
  useEffect(()=>{if(!window.Chart)return;const c=new window.Chart(r.current,{type,data,options:{responsive:true,maintainAspectRatio:false,...options}});return()=>c.destroy()},[JSON.stringify(data)]);
  return <div style={{height:240}}><canvas ref={r}/></div>;
}
const Card=({t,v,sub,c})=><div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><div className="text-xs font-medium text-slate-500">{t}</div><div className={`mt-1 text-2xl font-extrabold ${c||""}`}>{v}</div>{sub&&<div className="text-xs text-slate-400">{sub}</div>}</div>;

function Login({onDone}){
  const [as,setAs]=useState("admin");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");

  async function checkRole(userObj){
    const { data: p } = await sb.from("profiles").select("*").eq("id", userObj.id).maybeSingle();
    const role = p?.role;
    const ok = as === "admin" ? ["owner","manager"].includes(role) : role === "cashier";
    if(!ok){
      await sb.auth.signOut();
      throw new Error(["owner","manager","cashier"].includes(role) ? `Akun ini terdaftar sebagai ${role === "cashier" ? "Kasir" : "Admin"}. Pilih tab ${role === "cashier" ? "Kasir" : "Admin"}.` : "Akun ini bukan staf KopiKita.");
    }
    onDone();
  }

  async function go(e){
    e.preventDefault(); setErr(""); setBusy(true);
    try{
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
      if(error) throw error;
      await checkRole(data.user);
    }catch(e){
      setErr(e.message);
    }finally{
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 p-4">
      <form onSubmit={go} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-7 shadow-2xl">
        <div className="text-center">
          <div className="text-4xl">☕</div>
          <h1 className="text-xl font-extrabold">KopiKita Dashboard</h1>
          <p className="text-sm text-slate-500">Masuk sebagai staf</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {[["admin","Admin"],["cashier","Kasir"]].map(([k,l])=>(
            <button type="button" key={k} onClick={()=>setAs(k)} className={`flex-1 rounded-lg py-2 text-sm font-bold ${as===k?"bg-amber-800 text-white shadow":"text-slate-500"}`}>{l}</button>
          ))}
        </div>
        <input className={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className={inp} type="password" placeholder="Kata sandi" value={pw} onChange={e=>setPw(e.target.value)} required/>
        {err&&<div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <button disabled={busy} className="w-full rounded-xl bg-amber-800 py-3 font-bold text-white disabled:opacity-60">{busy?"Memproses…":"Masuk sebagai "+(as==="admin"?"Admin":"Kasir")}</button>

      </form>
    </div>
  );
}

function Overview({orders}){
  const sales=orders.filter(o=>SALES.includes(o.status)),today=new Date().toDateString();
  const td=sales.filter(o=>new Date(o.created_at).toDateString()===today);
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d});
  const perDay=days.map(d=>sales.filter(o=>new Date(o.created_at).toDateString()===d.toDateString()).reduce((a,o)=>a+o.total,0));
  const types=["pickup","delivery","dine_in"].map(t=>sales.filter(o=>o.order_type===t).length);
  const prod={};sales.forEach(o=>(o.order_items||[]).forEach(i=>prod[i.name]=(prod[i.name]||0)+i.qty));
  const top=Object.entries(prod).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const total=sales.reduce((a,o)=>a+o.total,0);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card t="Omzet hari ini" v={rp(td.reduce((a,o)=>a+o.total,0))} c="text-amber-800"/>
      <Card t="Pesanan hari ini" v={td.length}/>
      <Card t="Total penjualan" v={rp(total)} sub={sales.length+" pesanan"}/>
      <Card t="Rata-rata pesanan" v={rp(sales.length?Math.round(total/sales.length):0)}/></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:col-span-2"><div className="mb-2 font-bold">Penjualan 7 hari terakhir</div>
        <Cht type="bar" data={{labels:days.map(d=>d.getDate()+"/"+(d.getMonth()+1)),datasets:[{label:"Omzet",data:perDay,backgroundColor:"#92400e",borderRadius:8}]}} options={{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v>=1000?v/1000+"rb":v}}}}}/></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><div className="mb-2 font-bold">Tipe layanan</div>
        <Cht type="doughnut" data={{labels:["Pickup","Delivery","Dine-in"],datasets:[{data:types,backgroundColor:["#92400e","#0d9488","#7c3aed"]}]}}/></div></div>
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><div className="mb-2 font-bold">Produk terlaris</div>
      {!top.length&&<div className="text-sm text-slate-400">Belum ada data penjualan.</div>}
      {top.map(([n,q],i)=><div key={n} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0"><span>{i+1}. {n}</span><b>{q} terjual</b></div>)}</div></div>;
}

function Orders({orders,names,reload,notify}){
  const [f,setF]=useState("aktif");
  const list=orders.filter(o=>f==="aktif"?["received","preparing","ready","on_delivery"].includes(o.status):f==="selesai"?["completed","cancelled","expired"].includes(o.status):o.status==="pending_payment");
  async function setStatus(o,s){const {error}=await sb.from("orders").update({status:s}).eq("id",o.id);error?notify(error.message,"err"):reload()}
  async function paid(o){const {error}=await sb.rpc("mark_paid",{p_order_id:o.id});error?notify(error.message,"err"):(notify("Pembayaran diterima"),reload())}
  return <div className="space-y-3">
    <div className="flex gap-2">{[["aktif","Aktif"],["selesai","Riwayat"],["tunggu","Menunggu bayar"]].map(([k,l])=><button key={k} onClick={()=>setF(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${f===k?"bg-amber-800 text-white":"bg-white ring-1 ring-slate-200"}`}>{l}</button>)}</div>
    {!list.length&&<div className="rounded-2xl bg-white p-10 text-center text-slate-400">Tidak ada pesanan.</div>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(o=>{const nx=nextOf(o),pr=names[o.user_id]||{};return <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between"><b>{o.code}</b><span className={`rounded-full px-3 py-0.5 text-xs font-bold ${COLOR[o.status]}`}>{ST[o.status]}</span></div>
      <div className="mt-1 text-xs text-slate-500">{TYPE[o.order_type]}{o.order_type==="dine_in"?" · Meja "+o.table_no:""} · {o.outlets?.name} · {new Date(o.created_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</div>
      <div className="mt-1 text-sm font-semibold">{pr.full_name||"Pelanggan"} <span className="font-normal text-slate-400">{pr.phone}</span></div>
      {o.order_type==="delivery"&&<div className="text-xs text-slate-500">📍 {o.delivery_address}</div>}
      <div className="my-2 space-y-0.5 text-sm">{(o.order_items||[]).map((i,k)=><div key={k}>{i.qty}× {i.name}<span className="text-xs text-slate-400"> {i.options&&Object.values(i.options).filter(v=>v&&v!=="false").join(", ")}</span></div>)}</div>
      <div className="flex items-center justify-between"><b>{rp(o.total)}</b><span className={`text-xs font-bold ${o.payment_status==="paid"?"text-emerald-600":"text-rose-600"}`}>{o.payment_status==="paid"?"LUNAS":"BELUM BAYAR"}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {o.payment_status==="unpaid"&&!["cancelled","expired"].includes(o.status)&&<button onClick={()=>paid(o)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Terima bayar</button>}
        {nx&&<button onClick={()=>setStatus(o,nx)} className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-bold text-white">→ {ST[nx]}</button>}
        {o.status==="received"&&<button onClick={()=>setStatus(o,"cancelled")} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">Batalkan</button>}</div></div>})}</div></div>;
}

