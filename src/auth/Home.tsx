import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, LayoutDashboard, LoaderCircle, LogOut, Plus, ShieldCheck, Users, Palette } from 'lucide-react';
import { Brand, RoomDrawing } from './Brand';
import { api, ApiError, errorMessage } from './api';
import type { User } from './api';
import { Message } from './AuthForms';
import CompanyForm from '../companies/CompanyForm';
import CompanyHome from '../companies/CompanyHome';
import type { Company } from '../companies/types';
import '../companies/companies.css';
import { portalURL } from './routes';
import '../companies/branding.css';
import '../companies/schramm-home.css';
import { appearanceStyle } from '../companies/appearance';
import AppearanceEditor from '../companies/AppearanceEditor';

interface Props { onLogout: () => Promise<void>; onExpired: () => void; route: string; navigate: (route: string) => void; onPendingCredentials: (pending: boolean) => void; }
interface HomeData { user: User; companies?: Company[]; company?: Company; }
export default function Home({ onLogout, onExpired, route, navigate, onPendingCredentials }: Props) {
  const [data, setData] = useState<HomeData | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [editingAppearance,setEditingAppearance]=useState(false);
  const [appearanceSaved,setAppearanceSaved]=useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const creating = route === '/unternehmen/neu';
  const admin = data?.user.role === 'brudello_admin';
  useEffect(() => { if (data) heading.current?.focus({ preventScroll: true }); }, [data]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api<HomeData>('/home');
        let selected = result.company ?? null;
        if (result.user.role === 'brudello_admin' && route.startsWith('/unternehmen/') && !creating) {
          selected = (await api<{company:Company}>(`/companies/${route.split('/')[2]}`)).company;
        }
        if (active) { setData(result); setCompany(selected); }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.code === 'PASSWORD_CHANGE_REQUIRED')) onExpired();
        else setError(errorMessage(err));
      }
    }
    void load();
    return () => { active = false; };
  }, [attempt, onExpired, route, creating]);
  useEffect(()=>{
    if(!company || editingAppearance) return;
    let active=true;
    const refresh=async()=>{
      if(document.visibilityState!=='visible') return;
      try { const result=await api<{company:Company}>(`/companies/${company.id}`); if(active) setCompany(result.company); }
      catch(err) {if(active && err instanceof ApiError && err.status===401) onExpired();}
    };
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    const interval=window.setInterval(refresh,60_000);
    return ()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(interval);};
  },[company?.id,editingAppearance,onExpired]);
  function openAppearance() { setAppearanceSaved(false); setEditingAppearance(true); }
  useEffect(() => {
    if (!appearanceSaved) return;
    const timer = window.setTimeout(() => setAppearanceSaved(false), 8000);
    return () => clearTimeout(timer);
  }, [appearanceSaved]);
  const schramm = company?.brandTheme === 'schramm';
  const navigation = <>
    <button className={`portal-nav-active company-nav${schramm && !admin ? ' is-current' : ''}`} aria-current={schramm && !admin ? 'page' : undefined} onClick={() => navigate('/home')}><LayoutDashboard size={19}/>{company && admin ? 'Alle Unternehmen' : 'Übersicht'}</button>
    {company && admin && <button className="company-style-nav" onClick={openAppearance}><Palette size={19}/>Erscheinungsbild</button>}
  </>;
  async function logout() {
    setBusy(true); setError('');
    try { await onLogout(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <div className="portal-home" data-company-theme={company ? (company.brandTheme ?? 'default') : undefined} style={company ? appearanceStyle(company) : undefined}>
    <header className="portal-home-header">{data && company ? <div className="company-header-brand"><Building2 size={28} style={{color:company.appearance?.primary ?? company.brandColor}}/><strong>{company.name}</strong></div> : <Brand/>}
      {schramm && <nav className="sh-top-nav" aria-label="Hauptnavigation">{navigation}</nav>}
      <span className="portal-admin-tag"><ShieldCheck size={16}/>{company ? (admin ? 'Brudello · Unternehmensverwaltung' : 'Unternehmensportal') : 'Brudello Verwaltung'}</span>
      {schramm && data && <span className="sh-avatar"><span aria-hidden="true">{data.user.name.slice(0,1)}</span><span className="sh-sr-only">Angemeldet als {data.user.name}</span></span>}
      <button className="portal-signout" onClick={logout} disabled={busy}><LogOut size={17}/>{busy ? 'Wird abgemeldet …' : 'Abmelden'}</button>
    </header>
    <div className="portal-home-body">{!schramm && <aside className="portal-sidebar">{navigation}
      <div className="portal-sidebar-account"><span className="portal-avatar">{data?.user.name.slice(0,1) ?? 'B'}</span><div><strong>{data?.user.name ?? 'Brudello'}</strong><small>{data && !admin ? 'Unternehmenszugang' : 'Administration'}</small></div></div>
    </aside>}
    <main className="portal-home-main" id="main-content">
      {error && <><Message>{error}</Message>{!data && <div className="company-error-actions"><button className="portal-link" onClick={() => { setError(''); setAttempt(n => n + 1); }}>Erneut versuchen</button><button className="portal-link" onClick={() => navigate('/home')}>Zur Übersicht</button></div>}</>}
      {!data && !error && <div className="portal-loading" role="status"><LoaderCircle className="portal-spin"/>Ihre Übersicht wird geladen …</div>}
      {data && (creating && admin ? <CompanyForm onClose={() => navigate('/home')} onCreated={id => navigate(`/unternehmen/${id}`)} onExpired={onExpired} onPendingCredentials={onPendingCredentials}/> : company ? <><CompanyHome company={company} admin={admin} userName={data.user.name} onBack={() => navigate('/home')} onEditAppearance={openAppearance}/>{appearanceSaved && <p className="appearance-saved" role="status">Das Erscheinungsbild wurde gespeichert.</p>}</> : admin ? <>
        <section className="portal-welcome"><div><p className="portal-home-kicker">Ihre Zentrale</p><h1 ref={heading} tabIndex={-1}>Willkommen bei Brudello.</h1>
          <p>Schön, dass Sie da sind, {data.user.name}.<br/>Hier behalten Sie Ihre Unternehmen im Blick.</p></div><RoomDrawing/></section>
        <section className="portal-companies" aria-labelledby="companies-heading"><div className="portal-section-heading"><div><h2 id="companies-heading">Unternehmen <span className="company-count">{data.companies?.length ?? 0}</span></h2><p>Der gemeinsame Ausgangspunkt für Ihre Partner.</p></div>
          <button className="portal-add-company is-enabled" onClick={() => navigate('/unternehmen/neu')}><Plus size={17}/>Unternehmen hinzufügen</button></div>
          {data.companies?.length ? <div className="company-list">{data.companies.map(item => <button className="company-list-item" key={item.id} onClick={() => navigate(`/unternehmen/${item.id}`)} aria-label={`${item.name} öffnen`}>
            <span className="company-list-icon" style={{color:item.brandColor}}><Building2 size={25}/></span><span className="company-list-info"><strong>{item.name}</strong><span>{item.contactName || 'Unternehmensbereich'}</span></span><span className="company-list-users"><Users size={16}/>{item.userCount} / {item.userLimit}<span>Benutzer</span></span><ArrowRight size={19}/>
          </button>)}</div> : <div className="portal-empty"><div className="portal-empty-icon"><Building2 size={33} strokeWidth={1.4}/></div>
            <h3>Ihr erstes Unternehmen.</h3><p>Legen Sie Ihren ersten Partner an.<br/>Jedes Unternehmen erhält eine eigene Startseite und eigene Zugänge.</p>
            <button className="portal-link" onClick={() => navigate('/unternehmen/neu')}>Unternehmen hinzufügen</button></div>}
        </section>
        <section className="portal-account-summary" aria-label="Ihr Zugang"><ShieldCheck size={22}/><div><strong>Ihr Brudello-Zugang ist eingerichtet.</strong><p>{data.user.email}</p></div><span>Administrator</span></section>
      </> : null)}
      {company && admin && <section className="company-portal-access" aria-label="Unternehmenszugang"><h2>Eigener Unternehmenszugang</h2><p>Unternehmenscode: <code>{company.portalSlug}</code></p><p><a href={portalURL(company.portalSlug)} target="_blank" rel="noreferrer">{window.location.origin}{portalURL(company.portalSlug)}</a></p><p>Diesen Link können Ihre Benutzer für die persönliche Anmeldung speichern.</p></section>}
      <footer className="portal-home-footer">Brudello Partnerportal<span>Lokale Entwicklungsumgebung</span></footer>
    </main></div>
    {editingAppearance && company && admin && <AppearanceEditor company={company} onClose={()=>setEditingAppearance(false)} onSaved={updated=>{setCompany(updated);setEditingAppearance(false);setAppearanceSaved(true);}} onExpired={onExpired}/>}
  </div>;
}
