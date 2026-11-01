import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TOKEN_KEY, useAuth } from "../context/AuthContext.jsx";
import { formatDate, formatTimeRange } from "../utils/dates.js";

async function adminFetch(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Admin request failed.");
  return payload;
}

const emptySession = { workshopId:"", date:"", startTime:"18:30", endTime:"20:30", capacity:8, price:65, status:"published" };
const emptyPromo = { code:"", label:"", discountType:"percent", amount:10, appliesTo:"all", active:true, maxUses:"" };

const imageToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve("");
  if (file.size > 2.5 * 1024 * 1024) return reject(new Error("Please use an image under 2.5 MB."));
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("Could not read that image."));
  reader.readAsDataURL(file);
});

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("calendar");
  const [status, setStatus] = useState("");
  const [workshops, setWorkshops] = useState([]);
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [editingId, setEditingId] = useState("");
  const [business, setBusiness] = useState({});
  const [policies, setPolicies] = useState({ cancellationDetails: [] });
  const [contentWorkshopId, setContentWorkshopId] = useState("");
  const [contentForm, setContentForm] = useState({});
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState(emptyPromo);
  const [membershipConfig, setMembershipConfig] = useState({ plans: [] });
  const [memberForm, setMemberForm] = useState({ email:"", planKey:"petal", billingInterval:"monthly" });

  const loadAll = async () => {
    const [ws, b, p, promoData, memberData] = await Promise.all([
      adminFetch("/api/admin/workshop-sessions"),
      adminFetch("/api/admin/settings/business"),
      adminFetch("/api/admin/settings/policies"),
      adminFetch("/api/admin/promos"),
      fetch("/api/membership").then((r) => r.json()),
    ]);
    setWorkshops(ws); setBusiness(b); setPolicies({ ...p, cancellationDetails: p.cancellationDetails || [] }); setPromos(promoData); setMembershipConfig(memberData);
    if (!sessionForm.workshopId && ws[0]) setSessionForm((f) => ({ ...f, workshopId: ws[0].id, price: ws[0].price || 65 }));
    if (!contentWorkshopId && ws[0]) { setContentWorkshopId(ws[0].id); setContentForm(ws[0]); }
    if (memberData.plans?.[0]) setMemberForm((f) => ({ ...f, planKey: f.planKey || memberData.plans[0].key }));
  };

  useEffect(() => { if (user?.isAdmin) loadAll().catch((e) => setStatus(e.message)); }, [user?.isAdmin]);

  const sessions = useMemo(() => workshops.flatMap((w) => (w.sessions || []).map((s) => ({ ...s, workshopTitle:w.title }))).sort((a,b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [workshops]);
  const selectedWorkshop = workshops.find((w) => w.id === contentWorkshopId);

  if (authLoading) return <main className="shell section"><p>Checking admin access…</p></main>;
  if (!user) return <main className="shell section admin-gate"><span className="mini-overline">STUDIO ADMIN</span><h1>Sign in to manage Bloom.</h1><Link className="brick-button" to="/account">Sign in</Link></main>;
  if (!user.isAdmin) return <main className="shell section admin-gate"><span className="mini-overline">STUDIO ADMIN</span><h1>This account isn't an admin.</h1><p>Add this exact email to <code>ADMIN_EMAILS</code> in <code>server/.env</code> and restart the server.</p></main>;

  const saveSession = async (event) => {
    event.preventDefault(); setStatus("Saving…");
    try {
      if (editingId) await adminFetch(`/api/admin/workshop-sessions/${editingId}`, { method:"PATCH", body:JSON.stringify(sessionForm) });
      else await adminFetch("/api/admin/workshop-sessions", { method:"POST", body:JSON.stringify(sessionForm) });
      setStatus(editingId ? "Session updated." : "Workshop date published."); setEditingId(""); setSessionForm({ ...emptySession, workshopId:workshops[0]?.id || "", price:workshops[0]?.price || 65 }); await loadAll();
    } catch (e) { setStatus(e.message); }
  };
  const startEdit = (s) => { setEditingId(s.id); setSessionForm({ workshopId:s.workshopId,date:s.date,startTime:s.startTime,endTime:s.endTime||"",capacity:s.capacity,price:s.price,status:s.status }); window.scrollTo({ top:0, behavior:"smooth" }); };
  const cancelSession = async (id) => { if (!confirm("Cancel this workshop date?")) return; await adminFetch(`/api/admin/workshop-sessions/${id}`, { method:"DELETE" }); setStatus("Session cancelled."); await loadAll(); };

  const saveBusiness = async (e) => { e.preventDefault(); try { setBusiness(await adminFetch("/api/admin/settings/business", { method:"PUT", body:JSON.stringify(business) })); setStatus("Business/contact details saved."); } catch(e){ setStatus(e.message); } };
  const savePolicies = async (e) => { e.preventDefault(); try { setPolicies(await adminFetch("/api/admin/settings/policies", { method:"PUT", body:JSON.stringify(policies) })); setStatus("Policies saved and updated on the public site."); } catch(e){ setStatus(e.message); } };

  const chooseContentWorkshop = (id) => { setContentWorkshopId(id); const w=workshops.find((x)=>x.id===id); setContentForm(w || {}); };
  const saveWorkshopContent = async (e) => { e.preventDefault(); try { await adminFetch(`/api/admin/workshop-content/${contentWorkshopId}`, { method:"PUT", body:JSON.stringify(contentForm) }); setStatus("Workshop wording/images saved."); await loadAll(); } catch(e){ setStatus(e.message); } };
  const replaceMainImage = async (file) => { try { const data=await imageToDataUrl(file); setContentForm((f)=>({ ...f, image:data, gallery:[data, ...(f.gallery||[]).filter((x)=>x!==f.image)] })); } catch(e){ setStatus(e.message); } };
  const replaceGallery = async (files) => { try { const images = await Promise.all(Array.from(files || []).slice(0, 4).map(imageToDataUrl)); if (images.length) setContentForm((f)=>({ ...f, gallery:images })); } catch(e){ setStatus(e.message); } };

  const savePromo = async (e) => { e.preventDefault(); try { await adminFetch("/api/admin/promos", { method:"POST", body:JSON.stringify({ ...promoForm, maxUses:promoForm.maxUses || null }) }); setPromoForm(emptyPromo); setPromos(await adminFetch("/api/admin/promos")); setStatus("Promotion saved."); } catch(e){ setStatus(e.message); } };
  const disablePromo = async (code) => { await adminFetch(`/api/admin/promos/${code}`, { method:"DELETE" }); setPromos(await adminFetch("/api/admin/promos")); setStatus(`${code} disabled.`); };

  const activateMember = async (e) => { e.preventDefault(); try { await adminFetch("/api/admin/memberships/activate", { method:"POST", body:JSON.stringify(memberForm) }); setStatus("Membership activated. Credits and discount are now available on that customer's account."); } catch(e){ setStatus(e.message); } };

  return <main className="shell admin-page section">
    <header className="admin-heading"><div><span className="mini-overline">BLOOM STUDIO ADMIN</span><h1>Studio Dashboard</h1><p>Vicky can manage dates, class wording/images, business details, policies, promos, and memberships here without touching code.</p></div></header>
    <nav className="admin-tabs">
      {[['calendar','Calendar'],['content','Classes & Images'],['business','Contact Info'],['policies','Policies'],['promos','Promos'],['members','Memberships']].map(([key,label]) => <button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
    </nav>
    {status && <p className="admin-status" role="status">{status}</p>}

    {tab === 'calendar' && <>
      <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">{editingId?'EDIT SESSION':'NEW SESSION'}</span><h2>{editingId?'Update workshop date':'Publish a real workshop date'}</h2></div>
        <form className="admin-session-form" onSubmit={saveSession}>
          <label>Workshop<select value={sessionForm.workshopId} onChange={(e)=>{const w=workshops.find(x=>x.id===e.target.value);setSessionForm({...sessionForm,workshopId:e.target.value,price:w?.price||sessionForm.price})}} required><option value="">Choose</option>{workshops.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
          <label>Date<input type="date" value={sessionForm.date} onChange={(e)=>setSessionForm({...sessionForm,date:e.target.value})} required /></label>
          <label>Start time<input type="time" value={sessionForm.startTime} onChange={(e)=>setSessionForm({...sessionForm,startTime:e.target.value})} required /></label>
          <label>End time<input type="time" value={sessionForm.endTime} onChange={(e)=>setSessionForm({...sessionForm,endTime:e.target.value})} /></label>
          <label>Seats<input type="number" min="1" value={sessionForm.capacity} onChange={(e)=>setSessionForm({...sessionForm,capacity:Number(e.target.value)})} /></label>
          <label>Price ($)<input type="number" min="0" step=".01" value={sessionForm.price} onChange={(e)=>setSessionForm({...sessionForm,price:Number(e.target.value)})} /></label>
          <label>Status<select value={sessionForm.status} onChange={(e)=>setSessionForm({...sessionForm,status:e.target.value})}><option value="published">Published</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label>
          <div className="admin-form-actions"><button className="brick-button" type="submit">{editingId?'Save Changes':'Publish Session'}</button>{editingId&&<button className="outline-button" type="button" onClick={()=>{setEditingId('');setSessionForm(emptySession)}}>Cancel Edit</button>}</div>
        </form>
      </section>
      <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">LIVE SCHEDULE</span><h2>Upcoming sessions</h2></div><div className="admin-session-list">{sessions.map(s=><article className={`admin-session-row ${s.status==='cancelled'?'is-cancelled':''}`} key={s.id}><div><strong>{s.workshopTitle}</strong><span>{formatDate(s.date)} · {formatTimeRange(s)}</span></div><div><strong>{s.spotsLeft} / {s.capacity}</strong><span>seats left</span></div><div><strong>${s.price}</strong><span>{s.status}</span></div><div className="admin-row-actions"><button onClick={()=>startEdit(s)}>Edit</button>{s.status!=='cancelled'&&<button onClick={()=>cancelSession(s.id)}>Cancel</button>}</div></article>)}</div></section>
    </>}

    {tab === 'content' && <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">SELF-SERVICE CONTENT</span><h2>Change class wording or images</h2><p>These edits update the public class pages immediately. Uploads are stored with the site data; use reasonably sized web images.</p></div>
      <form className="content-editor" onSubmit={saveWorkshopContent}>
        <label>Workshop<select value={contentWorkshopId} onChange={(e)=>chooseContentWorkshop(e.target.value)}>{workshops.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
        {contentForm.image && <img className="admin-preview-image" src={contentForm.image} alt="Current workshop" />}
        <label>Replace main image<input type="file" accept="image/*" onChange={(e)=>replaceMainImage(e.target.files?.[0])} /></label>
        <label>Replace gallery (up to 4)<input type="file" accept="image/*" multiple onChange={(e)=>replaceGallery(e.target.files)} /></label>
        <label>Title<input value={contentForm.title||''} onChange={(e)=>setContentForm({...contentForm,title:e.target.value})}/></label>
        <label>Category<input value={contentForm.category||''} onChange={(e)=>setContentForm({...contentForm,category:e.target.value})}/></label>
        <label>Duration<input value={contentForm.duration||''} onChange={(e)=>setContentForm({...contentForm,duration:e.target.value})}/></label>
        <label>Location label<input value={contentForm.location||''} onChange={(e)=>setContentForm({...contentForm,location:e.target.value})}/></label>
        <label className="wide">Class description<textarea rows="5" value={contentForm.description||''} onChange={(e)=>setContentForm({...contentForm,description:e.target.value})}/></label>
        <label className="wide">What's provided<textarea rows="4" value={contentForm.provided||''} onChange={(e)=>setContentForm({...contentForm,provided:e.target.value})}/></label>
        <label className="wide">Skill level<textarea rows="3" value={contentForm.skill||''} onChange={(e)=>setContentForm({...contentForm,skill:e.target.value})}/></label>
        <button className="brick-button" type="submit">Save Class Changes</button>
      </form>
    </section>}

    {tab === 'business' && <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">BUSINESS DETAILS</span><h2>Contact information</h2></div><form className="content-editor" onSubmit={saveBusiness}>
      <label>Business name<input value={business.name||''} onChange={(e)=>setBusiness({...business,name:e.target.value})}/></label>
      <label>Public/contact address<input value={business.address||''} onChange={(e)=>setBusiness({...business,address:e.target.value,mapQuery:e.target.value})}/></label>
      <label>Official email<input type="email" value={business.email||''} placeholder="Contact@bloomstudioboston.com" onChange={(e)=>setBusiness({...business,email:e.target.value})}/></label>
      <label>Instagram<input value={business.instagram||''} onChange={(e)=>setBusiness({...business,instagram:e.target.value})}/></label>
      <label className="wide">Location note<textarea rows="3" value={business.locationNote||''} onChange={(e)=>setBusiness({...business,locationNote:e.target.value})}/></label>
      <button className="brick-button" type="submit">Save Contact Info</button>
    </form></section>}

    {tab === 'policies' && <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">PUBLIC POLICIES</span><h2>Change wording without code</h2></div><form className="content-editor" onSubmit={savePolicies}>
      <label className="wide">Short cancellation policy<textarea rows="3" value={policies.cancellationShort||''} onChange={(e)=>setPolicies({...policies,cancellationShort:e.target.value})}/></label>
      <label className="wide">Detailed policy — one point per line<textarea rows="10" value={(policies.cancellationDetails||[]).join('\n')} onChange={(e)=>setPolicies({...policies,cancellationDetails:e.target.value.split('\n').filter(Boolean)})}/></label>
      <label className="wide">Shop returns<textarea rows="3" value={policies.shopReturns||''} onChange={(e)=>setPolicies({...policies,shopReturns:e.target.value})}/></label>
      <label className="wide">Payment wording<textarea rows="3" value={policies.payment||''} onChange={(e)=>setPolicies({...policies,payment:e.target.value})}/></label>
      <label className="wide">Promotions wording<textarea rows="3" value={policies.promotions||''} onChange={(e)=>setPolicies({...policies,promotions:e.target.value})}/></label>
      <button className="brick-button" type="submit">Save Policies</button>
    </form></section>}

    {tab === 'promos' && <><section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">DISCOUNTS</span><h2>Create a promotion code</h2></div><form className="admin-session-form" onSubmit={savePromo}>
      <label>Code<input value={promoForm.code} onChange={(e)=>setPromoForm({...promoForm,code:e.target.value.toUpperCase().replace(/\s/g,'')})} placeholder="BLOOM10" required/></label>
      <label>Label<input value={promoForm.label} onChange={(e)=>setPromoForm({...promoForm,label:e.target.value})} placeholder="Seasonal promotion"/></label>
      <label>Type<select value={promoForm.discountType} onChange={(e)=>setPromoForm({...promoForm,discountType:e.target.value})}><option value="percent">Percent off</option><option value="fixed">Dollar amount off</option></select></label>
      <label>Amount<input type="number" min="0.01" step=".01" value={promoForm.amount} onChange={(e)=>setPromoForm({...promoForm,amount:Number(e.target.value)})}/></label>
      <label>Applies to<select value={promoForm.appliesTo} onChange={(e)=>setPromoForm({...promoForm,appliesTo:e.target.value})}><option value="all">Everything</option><option value="workshops">Workshops only</option><option value="products">Shop only</option></select></label>
      <label>Max uses<input type="number" min="1" value={promoForm.maxUses} onChange={(e)=>setPromoForm({...promoForm,maxUses:e.target.value})} placeholder="Unlimited"/></label>
      <div className="admin-form-actions"><button className="brick-button" type="submit">Save Promo</button></div>
    </form></section><section className="admin-panel"><h2>Promotion codes</h2><div className="promo-list">{promos.map(p=><div key={p.code}><strong>{p.code}</strong><span>{p.discountType==='percent'?`${p.amount}%`:`$${p.amount}`} · {p.appliesTo} · {p.active?'active':'disabled'}</span>{p.active&&<button onClick={()=>disablePromo(p.code)}>Disable</button>}</div>)}</div></section></>}

    {tab === 'members' && <section className="admin-panel"><div className="admin-panel-heading"><span className="mini-overline">MEMBERSHIP MANAGEMENT</span><h2>Activate a customer's Bloom Club</h2><p>Use this for complimentary or manually granted memberships. Paid memberships are created through Square checkout.</p></div><form className="admin-session-form" onSubmit={activateMember}>
      <label>Customer email<input type="email" value={memberForm.email} onChange={(e)=>setMemberForm({...memberForm,email:e.target.value})} required/></label>
      <label>Tier<select value={memberForm.planKey} onChange={(e)=>setMemberForm({...memberForm,planKey:e.target.value})}>{membershipConfig.plans?.map(p=><option key={p.key} value={p.key}>{p.name} · ${p.monthlyPrice}/mo</option>)}</select></label>
      <label>Billing<select value={memberForm.billingInterval} onChange={(e)=>setMemberForm({...memberForm,billingInterval:e.target.value})}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
      <div className="admin-form-actions"><button className="brick-button" type="submit">Activate Membership</button></div>
    </form><div className="membership-admin-tier-list">{membershipConfig.plans?.map(p=><div key={p.key}><strong>{p.name}</strong><span>${p.monthlyPrice}/mo · ${p.annualPrice}/yr · {p.monthlyCredits} credits/mo · {p.discountPercent}% off {p.discountScope==='all'?'everything':'workshops'}{p.friendPassesPerYear?` · ${p.friendPassesPerYear} friend pass/year`:''}</span></div>)}</div></section>}
  </main>;
}
