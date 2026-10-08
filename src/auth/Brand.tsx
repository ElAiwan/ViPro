export function Brand() {
  return <div className="portal-brand" aria-label="Brudello">
    <svg width="31" height="35" viewBox="0 0 31 35" aria-hidden="true" fill="none">
      <path d="M3 3v28h12c8 0 12-4 12-10s-4-10-12-10H9" stroke="currentColor" strokeWidth="5"/>
      <path d="M10 19h7v5h-7z" fill="currentColor"/>
    </svg><span>brudello<span className="brand-period">.</span></span>
  </div>;
}
export function RoomDrawing() {
  return <svg className="portal-room-drawing" viewBox="0 0 500 380" fill="none" aria-hidden="true">
    <path d="M44 283 240 358 464 272 268 197Z" fill="currentColor" opacity=".04"/>
    <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M44 283V102L268 18l196 77v177l-224 86-196-75Z"/>
      <path d="M268 18v179L44 283m224-86 196 75M240 358V176L44 102m196 74L464 95" opacity=".3"/>
      <path d="M83 248v-50l102-38 58 22v51l-103 39-57-24Z"/>
      <path d="m83 198 58 23 102-39m-102 39v51m-40-62v18m81-21v17"/>
      <ellipse cx="165" cy="195" rx="27" ry="9" transform="rotate(-20 165 195)"/>
      <path d="M172 180v-17q0-8-7-5l-7 3v10"/>
      <path d="M104 163V97q0-24 27-34l37-14q26-10 26 17v63Z"/>
      <path d="M113 152V98q0-18 20-25l30-12q22-9 22 15v47Z" opacity=".45"/>
      <path d="m298 103 109 42v113l-109-42V103Zm55 21v113m-5-63v20m-20-88v29m-9-3 18 7"/>
      <path d="m287 263 92 36-85 32-92-35 85-33Zm-63 39 84-32m-59 42 84-32m-59 42 84-32" opacity=".35"/>
      <path d="M412 287v-45m0 19c-21-4-25-21-25-21 20-1 25 21 25 21Zm0-6c17-4 21-23 21-23-18 2-21 23-21 23Z"/>
    </g>
    <g stroke="currentColor" opacity=".25"><path d="m22 309 211 82M10 298l20 25m194 57 18 23M477 289l-224 86m214-100 20 26"/></g>
  </svg>;
}
