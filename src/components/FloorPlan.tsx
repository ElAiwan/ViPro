import { Camera, Plus } from 'lucide-react';
import { labels,positionFor,roomItems } from '../catalog';
import type { Room,Item,CameraView,Selection } from '../catalog';
interface Props {room:Room;selected:Item|null;variants:Selection;onSelect:(item:Item)=>void;onCamera:(camera:CameraView)=>void}
export default function FloorPlan({room,selected,variants,onSelect,onCamera}:Props){
 const [w,d]=room.size;const s=100;const width=w*s,height=d*s;const left=100,top=70;
 const point=(item:Item)=>{const [x,,z]=positionFor(room,item);return [left+(x+w/2)*s,top+(z+d/2)*s]};
 const items=roomItems(room);
 return <div className="floor-plan">
 <svg viewBox={`0 0 ${width+200} ${height+150}`} aria-label={`Grundriss ${room.name}, ${w} mal ${d} Meter`} role="img">
 <defs><pattern id="tiles" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill={room.id==='design'?'#ccd0cc':'#e3e5dd'}/><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bac1b9" strokeWidth=".7"/></pattern><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#64756f" strokeWidth="1"/></pattern></defs>
 <rect x={left} y={top} width={width} height={height} fill="url(#tiles)" stroke="#40514c" strokeWidth="12"/>
 <rect x={left+width*.54} y={top+height-7} width="90" height="14" fill="#eaece7"/>
 <path d={`M${left+width*.54} ${top+height}v-90m0 0a90 90 0 0 1 90 90`} fill="none" stroke="#66786e" strokeWidth="1.4"/>
 <rect x={left-7} y={top+90} width="14" height="70" fill="#eaece7" stroke="#69838a" strokeWidth="1.2"/><path d={`M${left-2} ${top+90}v70m4 0v-70`} stroke="#69838a"/>
 {items.filter(i=>i!=='mirror').map(item=>{const [x,y]=point(item);const active=selected===item;return <g key={item} transform={`translate(${x} ${y})`} fill={active?'#e9d6ac':'#fafbf7'} stroke={active?'#ae823f':'#6b7970'} strokeWidth="1.4">
 {item==='vanity'&&<><rect x="-50" y="-20" width="100" height="50" rx="3" fill={variants.vanity===1?'#b59269':variants.vanity===2?'#5c6460':room.wood}/><rect x="-32" y="-15" width="64" height="34" rx="9"/><circle cx="0" cy="0" r="2"/><path d="M0 -23v12" strokeWidth="3"/></>}
 {item==='toilet'&&<><rect x="-19" y="-22" width="38" height="12" rx="2"/><rect x="-18" y="-12" width="36" height="47" rx={variants.toilet===1?5:17} fill={variants.toilet===2?'#515854':undefined}/><path d="M-11 -4h22"/></>}
 {item==='shower'&&<><rect x="-60" y="-60" width="120" height="120" rx="3"/><path d="M-50 -50L50 50m-100 0L50 -50" opacity=".3"/><circle cx="0" cy="0" r="5"/><path d="M60 -60v120" stroke={variants.shower===1?'#202725':'#839fa3'} strokeWidth="4"/><text y="45" textAnchor="middle" fill="#54645d" stroke="none" fontSize="11">120 × 120</text></>}
 {item==='tub'&&<><rect x="-40" y="-85" width="80" height="170" rx={variants.tub===1?6:39} fill={variants.tub===2?'#59605c':undefined}/><rect x="-31" y="-74" width="62" height="148" rx={variants.tub===1?5:30}/><circle cy="-50" r="3"/></>}
 {item==='radiator'&&<><rect x="0" y="-25" width="12" height="50"/>{Array.from({length:7},(_,i)=><path key={i} d={`M0 ${-20+i*6}h12`}/>)}</>}
 </g>})}
 {(()=>{const [x,y]=point('mirror');return <path d={`M${x-42} ${y}h84`} stroke="#bc9a5e" strokeWidth="5"/>})()}
 <g className="dimensions" fill="none" stroke="#7c8982" strokeWidth=".8">
 <path d={`M${left} ${top-18}v-30m${width} 0v30M${left-5} ${top-38}h${width+10}M${left-5} ${top-33}l10 -10m${width-10} 10l10 -10`}/>
 <path d={`M${left+width+18} ${top}h32m0 ${height}h-32M${left+width+38} ${top-5}v${height+10}M${left+width+33} ${top+5}l10 -10m-10 ${height+10}l10 -10`}/>
 <path d={`M${left} ${top+height+20}v30m120 0v-30M${left} ${top+height+40}h120`}/>
 </g>
 <g fill="#566b61" fontSize="13" textAnchor="middle"><text x={left+width/2} y={top-47}>{w.toFixed(2).replace('.',',')} m</text><text transform={`translate(${left+width+55},${top+height/2}) rotate(90)`}>{d.toFixed(2).replace('.',',')} m</text><text x={left+60} y={top+height+60}>1,20 m</text><text x={left+width*.54+45} y={top+height+24} fontSize="11">Tür 90 cm</text><text x={left+width/2} y={top+height/2-10} fontSize="18">{(w*d).toFixed(1).replace('.',',')} m²</text><text x={left+width/2} y={top+height/2+10} fontSize="11">Raumhöhe 2,60 m</text></g>
 {items.map(item=>{let [x,y]=point(item);if(item==='mirror'){y-=13;x+=48}if(item==='vanity')y+=30;if(item==='radiator')x+=20;return <foreignObject key={item} x={x-22} y={y-22} width="44" height="44"><button className={`plan-hotspot ${selected===item?'active':''}`} aria-label={`${labels[item]} auswählen`} onClick={()=>onSelect(item)}><Plus size={17}/></button></foreignObject>})}
 {[{x:left+width*.64,y:top+height-42,camera:'entrance' as const},{x:left+width*.5,y:top+height*.32,camera:'vanity' as const}].map(p=><foreignObject key={p.camera} x={p.x-22} y={p.y-22} width="44" height="44"><button className="camera-hotspot" aria-label={`3D-Ansicht ${p.camera==='entrance'?'Eingang':'Waschtisch'}`} onClick={()=>onCamera(p.camera)}><Camera size={18}/></button></foreignObject>)}
 </svg><div className="plan-caption"><span>Entwurfsgrundriss</span><span>Beispielmaße · nicht zur Ausführung</span></div></div>
}
