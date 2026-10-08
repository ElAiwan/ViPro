import { useEffect, useId, useRef } from 'react';
import { BookOpen, FolderOpen, Mail, Palette, Users } from 'lucide-react';
import type { Company } from './types';

// Layout «Verlauf & Zonen» from the approved mockup (Manual bad & heizung 2026, S. 13–19).
const greeting = (hour: number) => hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
const BLOB_A = 'M151,36c22,20,36,52,30,82s-30,58-62,66s-72-3-92-30S1,84,18,55S67,13,98,11S129,16,151,36Z';
const BLOB_B = 'M162,48c19,24,24,60,10,88s-50,49-86,48S14,160,8,128S20,58,46,34S88,4,117,9S143,24,162,48Z';

function FlowLines({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 800 300" fill="none" stroke="currentColor" strokeWidth=".9" aria-hidden="true">
    <path d="M0 140c120-40 220 60 360 30s220-110 440-60"/><path d="M40 210c140-50 240 40 380 10s210-90 380-50"/><path d="M120 70c120 40 260 50 380 0s200-40 300 10"/>
  </svg>;
}

interface Props { company: Company; admin: boolean; userName: string; onBack: () => void; onEditAppearance: () => void; }
// «Alle Unternehmen» lives in the top navigation, so the admin strip only offers editing.
export default function SchrammHome({ company, admin, userName, onEditAppearance }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const gradient = useId();
  useEffect(() => { heading.current?.focus({ preventScroll: true }); document.title = `${company.name} · Brudello`; }, [company.id, company.name]);
  const now = new Date();
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const today = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return <div className="sh">
    {admin && <div className="sh-admin"><div className="sh-wrap">
      <span>Unternehmensansicht · Sie sind als Brudello-Administrator angemeldet.</span>
      <button className="sh-admin-edit" onClick={onEditAppearance}><Palette size={16}/>Erscheinungsbild bearbeiten</button>
    </div></div>}

    <section className="sh-hero" aria-labelledby="sh-title">
      <svg className="sh-hero-white" viewBox="0 0 840 560" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H690C780 70 790 200 740 300C700 380 620 450 470 480C300 510 120 500 0 520Z"/></svg>
      <FlowLines className="sh-hero-lines"/>
      <div className="sh-wrap sh-hero-inner">
        <div className="sh-greeting">
          <p className="sh-subhead">{today}</p>
          <h1 id="sh-title" ref={heading} tabIndex={-1}>{greeting(now.getHours())}, {firstName}.<br/>Willkommen bei {company.name}.</h1>
          <p>Hier entsteht Ihr digitaler Showroom. Kataloge und Beratungen kommen als Nächstes dazu.</p>
        </div>
        <div className="sh-art" aria-hidden="true">
          <svg className="sh-blob sh-blob-a" viewBox="0 0 200 200"><path d={BLOB_A}/></svg>
          <svg className="sh-blob sh-blob-b" viewBox="0 0 200 200"><path d={BLOB_B}/></svg>
        </div>
        <p className="sh-stoerer"><b>{company.userCount} von {company.userLimit}</b>Benutzerplätzen belegt</p>
      </div>
    </section>

    <div className="sh-wrap sh-content">
      <section className="sh-block" aria-labelledby="sh-sessions">
        <h2 id="sh-sessions">Ihre Beratungen</h2>
        <div className="sh-empty">
          <span className="sh-empty-icon"><FolderOpen size={26}/></span>
          <div><strong>Hier erscheinen Ihre Beratungen.</strong>
            <p>Sobald die Beratung freigeschaltet ist, legen Sie hier neue Termine an und setzen laufende fort.</p>
            <span className="sh-soon">In Vorbereitung</span></div>
          <FlowLines className="sh-empty-lines"/>
        </div>
      </section>
      <section className="sh-block" aria-labelledby="sh-catalogs">
        <h2 id="sh-catalogs">Ihre Kataloge</h2>
        <div className="sh-catalog">
          <svg className="sh-catalog-blob" viewBox="0 0 200 200" aria-hidden="true">
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--company-primary)' }}/><stop offset="1" style={{ stopColor: 'var(--company-secondary)' }}/></linearGradient></defs>
            <path d={BLOB_A} fill={`url(#${gradient})`}/>
          </svg>
          <BookOpen size={26}/>
          <strong>Badwelten, Produkte und Materialien.</strong>
          <p>Hier stöbern Sie bald gemeinsam mit Ihren Kundinnen und Kunden.</p>
          <span className="sh-soon">In Vorbereitung</span>
        </div>
      </section>
      {admin && <section className="sh-block sh-users" aria-labelledby="sh-users">
        <div className="sh-block-title"><h2 id="sh-users">Benutzerkonten</h2><span><Users size={15}/>{company.userCount} / {company.userLimit} Plätze</span></div>
        {company.users?.length ? <ul>{company.users.map(user => <li key={user.id}><div><strong>{user.name}</strong><span>{user.email}</span></div><span className={`sh-user-state${user.mustChangePassword ? '' : ' ready'}`}>{user.mustChangePassword ? 'Passwortwechsel ausstehend' : 'Zugang eingerichtet'}</span></li>)}</ul>
          : <p className="sh-muted">Für dieses Unternehmen wurden noch keine Benutzer angelegt.</p>}
      </section>}
      {(company.contactName || company.contactEmail) && <section className="sh-block sh-contact" aria-labelledby="sh-contact">
        <h2 id="sh-contact">Kontaktperson</h2>
        <div><span className="sh-empty-icon"><Mail size={22}/></span><div>{company.contactName && <strong>{company.contactName}</strong>}{company.contactEmail && <p>{company.contactEmail}</p>}</div></div>
      </section>}
    </div>
  </div>;
}
