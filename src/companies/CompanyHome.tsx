import { useEffect, useRef } from 'react';
import { ArrowLeft, BookOpen, Building2, FolderOpen, Mail, Users, Palette } from 'lucide-react';
import type { Company } from './types';
import SchrammHome from './SchrammHome';

interface Props { company: Company; admin: boolean; userName: string; onBack: () => void; onEditAppearance: () => void }
export default function CompanyHome(props: Props) {
  // Each template owns its layout; the neutral one stays as before.
  return props.company.brandTheme === 'schramm' ? <SchrammHome {...props}/> : <DefaultHome {...props}/>;
}

function DefaultHome({ company, admin, onBack, onEditAppearance }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({preventScroll:true}); document.title = `${company.name} · Brudello`; }, [company.id, company.name]);
  return <>
    {admin && <button className="portal-back company-back" onClick={onBack}><ArrowLeft size={17}/>Alle Unternehmen</button>}
    {admin && <div className="company-admin-view"><span>Unternehmensansicht · Sie sind als Brudello-Administrator angemeldet.</span><button onClick={onEditAppearance}><Palette size={17}/>Erscheinungsbild bearbeiten</button></div>}
    <section className="company-welcome">
      <div className="company-identity"><span className="company-identity-icon"><Building2 size={30}/></span><div><p>Ihr Unternehmensbereich</p><h1 ref={heading} tabIndex={-1}>{company.name}</h1></div></div>
      <p className="company-welcome-title">Raum für gute Beratung.</p><p>Ihre Badwelten und Kundenprojekte an einem Ort.</p>
      <div className="company-home-meta"><span><Users size={16}/>{company.userCount} von {company.userLimit} Benutzerplätzen belegt</span><span>Deutsch</span></div>
    </section>
    <div className="company-future-areas"><section><BookOpen size={25}/><h2>Kataloge</h2><p>Hier werden Ihre Badwelten und Produkte verfügbar sein.</p><span>Noch nicht eingerichtet</span></section><section><FolderOpen size={25}/><h2>Beratungssitzungen</h2><p>Hier finden Sie künftig die gespeicherten Projekte Ihrer Kunden.</p><span>Noch nicht eingerichtet</span></section></div>
    {admin && <section className="company-detail-users"><div className="company-detail-title"><h2>Benutzerkonten</h2><span>{company.userCount} / {company.userLimit} Plätze</span></div>
      {company.users?.length ? <ul>{company.users.map(user => <li key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span></div><span className={`company-user-state${user.mustChangePassword ? '' : ' ready'}`}>{user.mustChangePassword ? 'Passwortwechsel ausstehend' : 'Zugang eingerichtet'}</span></li>)}</ul> : <p className="company-detail-empty">Für dieses Unternehmen wurden noch keine Benutzer angelegt.</p>}
    </section>}
    {(company.contactName || company.contactEmail) && <section className="company-contact"><Mail size={20}/><div><h2>Kontaktperson</h2>{company.contactName && <p>{company.contactName}</p>}{company.contactEmail && <p>{company.contactEmail}</p>}</div></section>}
  </>;
}
