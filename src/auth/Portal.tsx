import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { api, ApiError, errorMessage } from './api';
import type { User } from './api';
import type { CompanyPortal } from '../companies/types';
import { appearanceStyle } from '../companies/appearance';
import { Brand, RoomDrawing } from './Brand';
import { ForgotForm, LoginForm, Message, NewPasswordForm } from './AuthForms';
import Home from './Home';
import {portalSlug,portalURL,readRoute,readResetToken} from './routes';
import './portal.css';
import './company-login.css';

const leaveWarning = 'Die temporären Zugangsdaten wurden noch nicht gespeichert und können später nicht erneut angezeigt werden. Trotzdem fortfahren?';
export default function Portal() {
  const [scope]=useState(portalSlug);
  const [route,setRoute]=useState(readRoute);
  const [resetToken,setResetToken]=useState(readResetToken);
  const [user,setUser]=useState<User|null>(null);
  const [ready,setReady]=useState(false);
  const [portal,setPortal]=useState<CompanyPortal|null>(null);
  const [portalError,setPortalError]=useState('');
  const [connectionError,setConnectionError]=useState('');
  const [flash,setFlash]=useState('');
  const [retry,setRetry]=useState(0);
  const revision=useRef(0), currentRoute=useRef(route);
  currentRoute.current=route;
  const pendingCredentials=useRef(false);
  const setPendingCredentials=useCallback((pending:boolean)=>{pendingCredentials.current=pending;},[]);
  const confirmLeave=useCallback(()=>!pendingCredentials.current || window.confirm(leaveWarning),[]);
  const navigate=useCallback((next:string)=>{
    window.history.replaceState(null,'',scope ? portalURL(scope,next) : next);setRoute(next);
  },[scope]);
  const guardedNavigate=useCallback((next:string)=>{if(next===currentRoute.current || confirmLeave())navigate(next);},[confirmLeave,navigate]);
  const expired=useCallback(()=>{
    revision.current++;setUser(null);setFlash('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');navigate('/anmelden');
  },[navigate]);
  useEffect(()=>{
    const changed=()=>{
      if(portalSlug()!==scope) {window.location.reload();return;}
      const next=readRoute();
      if(next!==currentRoute.current && !confirmLeave()) {navigate(currentRoute.current);return;}
      if(next==='/passwort-zuruecksetzen') {const incoming=readResetToken();if(incoming)setResetToken(incoming);}
      navigate(next);
    };
    window.addEventListener('hashchange',changed);window.addEventListener('popstate',changed);
    // Canonical pathname also removes a reset token from address/history immediately.
    navigate(readRoute());
    return ()=>{window.removeEventListener('hashchange',changed);window.removeEventListener('popstate',changed);};
  },[confirmLeave,navigate,scope]);
  useEffect(()=>{
    let active=true;const snapshot=revision.current;setConnectionError('');
    api<{user:User}>('/auth/session').then(data=>{if(active && snapshot===revision.current)setUser(data.user);})
      .catch(err=>{if(active && !(err instanceof ApiError && err.status===401))setConnectionError(errorMessage(err));})
      .finally(()=>{if(active)setReady(true);});
    return ()=>{active=false;};
  },[retry]);
  useEffect(()=>{
    if(!scope)return;
    let active=true;setPortalError('');
    const load=()=>{void api<{portal:CompanyPortal}>(`/portals/${encodeURIComponent(scope)}`).then(data=>{if(active){setPortal(data.portal);setPortalError('');}}).catch(err=>{if(active)setPortalError(errorMessage(err));});};
    load();window.addEventListener('focus',load);
    return ()=>{active=false;window.removeEventListener('focus',load);};
  },[scope,retry]);
  useEffect(()=>{
    if(!ready || connectionError)return;
    if(route==='/passwort-zuruecksetzen' || route==='/passwort-vergessen')return;
    if(user?.role==='company_user' && user.companySlug && !scope) {
      window.location.replace(portalURL(user.companySlug,user.mustChangePassword?'/passwort-aendern':'/home'));return;
    }
    if(!scope && user && !user.mustChangePassword && user.role==='brudello_admin' && /^\/unternehmen\/(neu|[a-f\d-]{36})$/.test(route))return;
    const destination=user ? (user.mustChangePassword?'/passwort-aendern':'/home') : '/anmelden';
    if(route!==destination)navigate(destination);
  },[user,route,ready,connectionError,navigate,scope]);
  useEffect(()=>{
    document.title=`${route==='/home'?'Übersicht':'Anmeldung'} · ${portal?.name ?? 'Brudello'}`;
    requestAnimationFrame(()=>document.querySelector<HTMLElement>('.portal h1')?.focus({preventScroll:true}));
  },[route,ready,portal?.name]);
  useEffect(()=>{
    if(!user)return;let active=true;
    const refresh=async()=>{
      if(document.visibilityState!=='visible')return;const snapshot=revision.current;
      try {const result=await api<{user:User}>('/auth/session');if(active && snapshot===revision.current && result.user.mustChangePassword!==user.mustChangePassword)setUser(result.user);}
      catch(err){if(active && snapshot===revision.current && err instanceof ApiError && err.status===401)expired();}
    };
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    const interval=window.setInterval(refresh,60_000);
    return ()=>{active=false;clearInterval(interval);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[user,expired]);
  async function logout(){
    if(!confirmLeave())return;
    await api('/auth/logout',{});revision.current++;setUser(null);setFlash('Sie wurden abgemeldet.');navigate('/anmelden');
  }
  function loggedIn(next:User){revision.current++;setUser(next);setFlash('');navigate(next.mustChangePassword?'/passwort-aendern':'/home');}
  function passwordChanged(){revision.current++;setUser(null);setFlash('Ihr Passwort wurde gespeichert. Melden Sie sich jetzt mit Ihrem neuen Passwort an.');navigate('/anmelden');}
  const home=ready && !connectionError && user && !user.mustChangePassword &&
    (scope ? Boolean(portal && user.companySlug===scope && route==='/home') : user.role==='brudello_admin' && (route==='/home' || /^\/unternehmen\/(neu|[a-f\d-]{36})$/.test(route)));
  const authLoading=!ready || Boolean(scope && !portal && !portalError);
  const companyAuth=Boolean(scope && portal);
  return <div className="portal"><a className="portal-skip" href="#main-content" onClick={event=>{event.preventDefault();const main=document.getElementById('main-content');if(main){main.tabIndex=-1;main.focus();}}}>Zum Inhalt</a>
    {home ? <Home key={route} route={route} navigate={guardedNavigate} onLogout={logout} onExpired={expired} onPendingCredentials={setPendingCredentials}/> :
      <div className={`portal-auth-layout${companyAuth?' company-auth':''}`} data-login-theme={portal?.brandTheme} style={portal?appearanceStyle(portal):undefined}>
        <aside className="portal-story">
          {companyAuth ? <div className="company-login-brand">{portal!.name}</div> : <Brand/>}
          <div className="portal-story-content"><h2>{companyAuth?<>Raum für Ideen.<br/>Ganz Ihr Bereich.</>:<>Raum für Ideen.<br/>Zeit für gute Beratung.</>}</h2><p>{companyAuth?'Ihr Team. Ihre Badwelten. Ihre Beratung.':'Ihr Zugang zu gemeinsamen Projekten und besonderen Badwelten.'}</p>{companyAuth ? <svg className="company-login-art" viewBox="0 0 500 300" aria-hidden="true"><path d="M77 49C125 7 288 5 352 57S442 194 363 251S137 299 66 224S29 92 77 49Z" fill="white" opacity=".16"/><path d="M164 86C222 35 372 48 407 123S362 278 262 283S92 225 109 161S144 102 164 86Z" fill="white" opacity=".3"/><g fill="none" stroke="white" opacity=".6"><path d="M0 171C155 63 216 288 500 102"/><path d="M0 190C155 82 216 307 500 121"/><path d="M0 209C155 101 216 326 500 140"/></g></svg> : <RoomDrawing/>}</div>
          <div className="portal-story-bottom"><span className="portal-story-line"/><p>{companyAuth?'Persönlich beraten. Gemeinsam gestalten.':'Menschen verbinden. Räume gestalten.'}</p></div>
        </aside>
        <section className="portal-form-side"><header className="portal-form-top"><span>{companyAuth?portal!.name:'Partnerportal'}</span><span className="portal-language">DE<span aria-hidden="true"> / </span>Deutsch</span></header>
          <main className="portal-form-main" id="main-content">
            {authLoading ? <div className="portal-loading" role="status"><LoaderCircle className="portal-spin"/>Anmeldung wird vorbereitet …</div> : portalError || connectionError ? <><div className="portal-form-heading"><h1 tabIndex={-1}>{portalError?'Unternehmensportal nicht verfügbar.':'Verbindung unterbrochen.'}</h1></div><Message>{portalError || connectionError}</Message><button className="portal-primary" onClick={()=>{setReady(false);setRetry(n=>n+1);}}>Erneut versuchen</button>{!scope && <a className="company-main-link" href="/anmelden">Zur Hauptanmeldung</a>}</> :
            route==='/passwort-vergessen'?<ForgotForm navigate={navigate}/>:
            route==='/passwort-zuruecksetzen'?<NewPasswordForm key={`reset-${resetToken}`} temporary={false} token={resetToken} navigate={navigate} onDone={passwordChanged} onExpired={expired} onLogout={logout}/>:
            user?.mustChangePassword?<NewPasswordForm key="temporary" temporary token="" navigate={navigate} onDone={passwordChanged} onExpired={expired} onLogout={logout}/>:
            <LoginForm key={scope ?? 'main'} navigate={navigate} onLogin={loggedIn} flash={flash} companyName={portal?.name}/>}
          </main>
          <footer className="portal-form-footer"><span><LockKeyhole size={14}/>Persönlicher Zugang</span><span>{companyAuth?'Ein Portal von Brudello':'Brudello Partnerportal'}</span></footer>
        </section>
      </div>}
  </div>;
}
