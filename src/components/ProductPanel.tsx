import {useEffect,useRef} from 'react';
import {ArrowLeft,ArrowRight,Check,X, Circle,RectangleHorizontal,PanelsTopLeft,Bath,ShowerHead,Heater,Square,Layers} from 'lucide-react';
import type {Item,Room,Selection} from '../catalog';
import {labels,products} from '../catalog';
export const itemIcons={mirror:Circle,vanity:PanelsTopLeft,toilet:Square,shower:ShowerHead,tub:Bath,radiator:Heater};
interface Props{item:Item;room:Room;variants:Selection;onVariant:(index:number)=>void;onClose:()=>void;onView:()=>void;is3d:boolean}
export default function ProductPanel({item,room,variants,onVariant,onClose,onView,is3d}:Props){
 const index=variants[item],product=products[item][index],rail=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{rail.current?.scrollTo({left:0});close.current?.focus({preventScroll:true});if(window.matchMedia('(max-width: 760px)').matches)close.current?.closest('aside')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},[item]);
 const Icon=itemIcons[item];
 return <aside className="product-panel" aria-label={`${labels[item]} – Varianten`}>
 <div className="panel-heading"><div><span className="small-label">Ihr Bad, Ihre Auswahl</span><h2>{labels[item]} <span>– Varianten</span></h2></div><button ref={close} className="icon-button" aria-label="Produktauswahl schließen" onClick={onClose}><X size={20}/></button></div>
 <div className="product-preview" style={{'--material':item==='vanity'?(index===1?'#ac835b':index===2?'#3c4440':room.wood):index===2?'#a48d63':index===1?'#444f49':'#ccd1c7'} as React.CSSProperties}><Icon size={100} strokeWidth={.8}/><span>Beispielprodukt</span></div>
 <div className="product-copy"><h3>{product.name}</h3><p>{product.description}</p></div>
 <div className="variant-heading"><span>Variante auswählen</span><div><button className="small-icon" aria-label="Vorherige Varianten" onClick={()=>rail.current?.scrollBy({left:-160,behavior:'smooth'})}><ArrowLeft size={17}/></button><button className="small-icon" aria-label="Weitere Varianten" onClick={()=>rail.current?.scrollBy({left:160,behavior:'smooth'})}><ArrowRight size={17}/></button></div></div>
 <div ref={rail} className="variant-rail" role="group" aria-label="Produktvarianten">{products[item].map((p,i)=>{const VariantIcon=item==='mirror'?[Circle,RectangleHorizontal,PanelsTopLeft][i]:Icon;return <button key={p.name} className={`variant-card ${i===index?'selected':''}`} aria-pressed={i===index} onClick={()=>onVariant(i)}><span className={`variant-symbol variant-${i}`}><VariantIcon size={34} strokeWidth={1.2}/>{i===index&&<i><Check size={13}/></i>}</span><span>{p.name}</span></button>})}</div>
 <dl className="product-specs"><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Maße</dt><dd>{product.dimensions}</dd></div><div><dt>Farbe / Licht</dt><dd>{product.color}</dd></div><div><dt>Stil</dt><dd>{room.name}</dd></div></dl>
 <p className="selection-status" role="status"><Check size={15}/>{product.name} ausgewählt</p>
 {!is3d&&<button className="gold-button" onClick={onView}><Layers size={18}/>Auswahl in 3D ansehen</button>}
 <p className="demo-note">Illustrative Produkte und Maße für diese Demo.</p>
 </aside>
}
