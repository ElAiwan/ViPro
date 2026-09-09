import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Html } from '@react-three/drei';
import { Vector3, DoubleSide } from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { Plus } from 'lucide-react';
import { positionFor,roomItems,labels } from '../catalog';
import type { Item,Room,Selection,CameraView } from '../catalog';
type V3=[number,number,number];
interface Props{room:Room;variants:Selection;selected:Item|null;camera:CameraView;cameraTick:number;onSelect:(item:Item)=>void;zoom:number}
function Box({p=[0,0,0],size,color,r=.025,metal=0}:{p?:V3;size:V3;color:string;r?:number;metal?:number}){return <RoundedBox args={size} position={p} radius={r} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={metal?.26:.6} metalness={metal}/></RoundedBox>}
function Cylinder({p,size,color,rotation=[0,0,0]}:{p:V3;size:[number,number,number];color:string;rotation?:V3}){return <mesh position={p} rotation={rotation} castShadow><cylinderGeometry args={[...size,24]}/><meshStandardMaterial color={color} roughness={.28} metalness={.55}/></mesh>}
function Oval({p,scale,color}:{p:V3;scale:V3;color:string}){return <mesh position={p} scale={scale} castShadow receiveShadow><sphereGeometry args={[1,32,20]}/><meshStandardMaterial color={color} roughness={.25}/></mesh>}
function Fixture({item,room,index}:{item:Item;room:Room;index:number}){
 const metal=room.metal;
 if(item==='mirror')return <group position={[0,1.72,0]}>
 {index===0?<><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.4,.4,.045,64]}/><meshStandardMaterial color="#d8eeea" metalness={.85} roughness={.16}/></mesh><mesh position={[0,0,.027]}><torusGeometry args={[.4,.018,8,64]}/><meshStandardMaterial color="#fff1d2" emissive="#ffdfa9" emissiveIntensity={1.6}/></mesh></>:<><Box size={[1,.7,index===2?.16:.025]} color="#c9dddd" metal={.8}/>{index===2&&[-.17,.17].map(x=><Box key={x} p={[x,0,.084]} size={[.006,.69,.007]} color="#768c8f" r={.002}/>)}{index===2&&<Box p={[0,.37,.04]} size={[1.03,.025,.1]} color="#f3eddd"/>}</>}
 </group>;
 if(item==='vanity'){const wide=index===1?1.2:index===2?.9:1;return <>
 <Box p={[0,.59,0]} size={[wide,.55,.5]} color={index===1?'#aa7950':index===2?'#393e3d':room.wood}/>
 <Box p={[0,.61,.253]} size={[wide-.05,.008,.004]} color="#626b60" r={.001}/><Box p={[0,.88,0]} size={[wide+.04,.04,.54]} color="#e8e8df"/>
 {index===2?<><Oval p={[0,.95,0]} scale={[.29,.11,.22]} color="#f7f5ed"/><Oval p={[0,1.014,0]} scale={[.235,.012,.17]} color="#bfc8c3"/></>:<><Box p={[0,.97,.015]} size={[.65,.16,.39]} color="#f9f9f1" r={.08}/><Box p={[0,1.052,.015]} size={[.53,.005,.28]} color="#cad2cc" r={.07}/></>}
 <Cylinder p={[0,1.09,-.19]} size={[.017,.017,.3]} color={metal}/><Cylinder p={[0,1.23,-.13]} size={[.017,.017,.13]} color={metal} rotation={[Math.PI/2,0,0]}/>
 <Cylinder p={[wide/2-.1,.97,-.09]} size={[.04,.04,.15]} color="#5d6b60"/>
 </>}
 if(item==='toilet'){const c=index===2?'#303735':'#f1f2ec';return <>
 <Box p={[0,.78,-.25]} size={[.24,.16,.03]} color={metal}/><Box p={[0,.78,-.23]} size={[.09,.09,.01]} color="#8b9590"/>
 {index===1?<><Box p={[0,.4,.05]} size={[.37,.3,.54]} color={c} r={.08}/><Box p={[0,.57,.06]} size={[.38,.045,.55]} color={c} r={.07}/></>:<><Oval p={[0,.4,.05]} scale={[.18,.18,.27]} color={c}/><Oval p={[0,.56,.05]} scale={[.18,.025,.27]} color={c}/></>}
 <Box p={[0,.4,-.15]} size={[.3,.25,.21]} color={c}/>
 </>}
 if(item==='shower'){const m=index===1?'#242d2d':index===2?'#b89a65':metal;return <>
 <Box p={[0,.055,0]} size={[1.2,.09,1.2]} color={room.id==='design'?'#727671':'#dedfd5'}/><Box p={[0,.103,-.47]} size={[.8,.01,.025]} color={m} r={.004}/>
 <mesh position={[.6,1.12,0]} castShadow><boxGeometry args={[.016,2.15,1.2]}/><meshPhysicalMaterial color={index===2?'#ba9260':'#bbd8d5'} transparent opacity={index===2?.35:.2} roughness={.1} side={DoubleSide} depthWrite={false}/></mesh>
 <Box p={[.6,2.2,0]} size={[.025,.025,1.2]} color={m} r={.003}/>{index>0&&[-.6,.6].map(z=><Box key={z} p={[.6,1.1,z]} size={[.025,2.2,.025]} color={m} r={.003}/>)}
 <Cylinder p={[-.49,1.36,-.42]} size={[.02,.02,1.6]} color={m}/><Cylinder p={[-.29,2.15,-.42]} size={[.018,.018,.42]} color={m} rotation={[0,0,Math.PI/2]}/><Cylinder p={[-.09,2.13,-.42]} size={[.16,.16,.025]} color={m}/><Cylinder p={[-.49,.98,-.42]} size={[.035,.035,.25]} color={m} rotation={[Math.PI/2,0,0]}/>
 </>}
 if(item==='tub')return <group rotation={[0,Math.PI/2,0]}>
 {index===1?<><Box p={[0,.32,0]} size={[1.7,.59,.8]} color="#e9ece5" r={.07}/><Box p={[0,.62,0]} size={[1.5,.012,.61]} color="#bdccc7" r={.07}/><Box p={[0,.628,0]} size={[1.29,.012,.47]} color="#dfebe6" r={.07}/></>:<><Oval p={[0,.32,0]} scale={[.85,.34,.4]} color={index===2?'#3e4643':'#f3f4ec'}/><Oval p={[0,.56,0]} scale={[.72,.075,.32]} color="#b8c9c1"/><Oval p={[0,.575,0]} scale={[.65,.03,.27]} color="#d6e4de"/></>}
 <Cylinder p={[.56,.61,-.5]} size={[.022,.022,1.1]} color={metal}/><Cylinder p={[.56,1.15,-.4]} size={[.02,.02,.2]} color={metal} rotation={[Math.PI/2,0,0]}/>
 </group>;
 const c=index===0?'#e5e8df':index===1?'#343c3a':'#b89a65';return <group rotation={[0,Math.PI/2,0]}>
 {[-.22,.22].map(x=><Cylinder key={x} p={[x,1.05,0]} size={[.022,.022,1.2]} color={c}/>)}
 {Array.from({length:12},(_,i)=><Cylinder key={i} p={[0,.51+i*.095,.025]} size={[.017,.017,.45]} color={c} rotation={[0,0,Math.PI/2]}/>)}<Box p={[.04,.97,.07]} size={[.28,.37,.04]} color={room.id==='nature'?'#a5a894':'#ced2c8'} r={.01}/>
 </group>;
}
function RoomGeometry({room,variants,selected,onSelect}:Pick<Props,'room'|'variants'|'selected'|'onSelect'>){
 const [w,d]=room.size;const [hover,setHover]=useState<Item|null>(null);
 useEffect(()=>{document.body.style.cursor=hover?'pointer':'';return()=>{document.body.style.cursor=''}},[hover]);
 const click=(e:ThreeEvent<MouseEvent>,item:Item)=>{if(e.delta>6)return;e.stopPropagation();onSelect(item)};
 return <group>
 <Box p={[0,-.13,0]} size={[w+.2,.22,d+.2]} color="#34453e"/>
 <Box p={[0,-.005,0]} size={[w,.035,d]} color={room.floor} r={.002}/>
 {Array.from({length:Math.ceil(w/.6)},(_,i)=><Box key={`x${i}`} p={[-w/2+i*.6,.016,0]} size={[.009,.003,d]} color={room.id==='design'?'#7c817a':'#d4cfc0'} r={.001}/>)}
 {Array.from({length:Math.ceil(d/.6)},(_,i)=><Box key={`z${i}`} p={[0,.016,-d/2+i*.6]} size={[w,.003,.009]} color={room.id==='design'?'#7c817a':'#d4cfc0'} r={.001}/>)}
 <Box p={[0,1.3,-d/2-.075]} size={[w+.2,2.6,.15]} color={room.wall}/>
 <Box p={[-w/2-.075,.52,0]} size={[.15,1.04,d]} color={room.wall}/>
 <Box p={[-w/2-.075,2.43,0]} size={[.15,.34,d]} color={room.wall}/>
 <Box p={[-w/2-.075,1.65,-d/2+.4]} size={[.15,1.25,.8]} color={room.wall}/>
 <Box p={[-w/2-.075,1.65,d/2-.4]} size={[.15,1.25,.8]} color={room.wall}/>
 <Box p={[-w/2-.085,1.65,0]} size={[.045,1.24,d-1.6]} color="#a4bebb"/>
 <Box p={[-w/2+.02,1.65,0]} size={[.04,1.3,.045]} color="#eceee4"/>
 <Box p={[-w/2+.02,1.02,0]} size={[.23,.055,d-1.55]} color="#e8e8dc"/>
 {room.id==='nature'&&Array.from({length:13},(_,i)=><Box key={i} p={[-w/2+.04,2.23-i*.043,0]} size={[.07,.025,d-1.6]} color="#a98054" r={.001}/>)}
 <Box p={[w/2,.13,0]} size={[.06,.25,d]} color={room.wall}/>
 <Box p={[w*.04+.45,.025,d/2]} size={[.9,.015,.07]} color={room.metal}/>
 <group position={[w*.04,0,d/2]} rotation={[0,-Math.PI/2,0]}><Box p={[.45,1.03,0]} size={[.9,2.06,.045]} color={room.id==='design'?'#747b72':'#e6e5da'}/><Cylinder p={[.78,1,.05]} size={[.013,.013,.12]} color={room.metal} rotation={[0,0,Math.PI/2]}/></group>
 <Box p={[-w/2+.85,1.55,-d/2+.014]} size={[1.4,2.05,.02]} color={room.id==='design'?'#353d3a':room.id==='nature'?'#ad8f6a':'#a1b0a0'}/>
 {roomItems(room).map(item=><group key={item} position={positionFor(room,item)} onClick={e=>click(e,item)} onPointerOver={e=>{e.stopPropagation();setHover(item)}} onPointerOut={()=>setHover(null)}>
 <Fixture item={item} room={room} index={variants[item]}/>
 {(selected===item||hover===item)&&<mesh rotation={[-Math.PI/2,0,0]} position={[item==='radiator'?.12:0,.026,0]}><ringGeometry args={[item==='shower'?.61:.42,item==='shower'?.64:.45,48]}/><meshBasicMaterial color="#e5be74" side={DoubleSide}/></mesh>}
 <Html position={[item==='radiator'?.1:0,item==='mirror'?2.23:item==='shower'?1.4:item==='radiator'?1.8:.8,item==='mirror'?.04:.14]} center distanceFactor={7} zIndexRange={[30,0]}><button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(item)}} className={`scene-hotspot ${selected===item?'active':''}`} aria-label={`${labels[item]} im Raum auswählen`}><Plus size={16}/></button></Html>
 </group>)}
 <group position={[w/2-.35,0,-d/2+.32]}><Cylinder p={[0,.22,0]} size={[.15,.12,.42]} color={room.id==='design'?'#333d36':'#a49a81'}/>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2)*.14,.5+(i%3)*.13,Math.cos(i*2)*.12]} rotation={[i*.3,0,i*.6]} scale={[.085,.24,.07]} castShadow><sphereGeometry args={[1,12,12]}/><meshStandardMaterial color={i%2?'#526647':'#748366'}/></mesh>)}</group>
 </group>
}
function CameraRig({room,camera,cameraTick,zoom}:{room:Room;camera:CameraView;cameraTick:number;zoom:number}){
 const ref=useRef<Controls>(null);const target=useRef(new Vector3(0,.65,0));const destination=useRef(new Vector3(5,4.6,6));const moving=useRef(true);const lastZoom=useRef(zoom);const {camera:cam}=useThree();
 useEffect(()=>{const [w,d]=room.size;const [vx,,vz]=positionFor(room,'vanity');const positions:Record<CameraView,[V3,V3]>={overview:[[w*1.18,4.4,d*1.4],[0,.8,0]],top:[[0,7,.001],[0,0,0]],entrance:[[w*.32,1.8,d*.67],[0,1.1,-d*.25]],vanity:[[vx+.6,1.7,vz+2.3],[vx,1.4,vz]],shower:[[.55,2.25,d*.78],[-w/2+.55,1,d/2-.5]]};destination.current.set(...positions[camera][0]);target.current.set(...positions[camera][1]);moving.current=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){cam.position.copy(destination.current);ref.current?.target.copy(target.current)}},[camera,cameraTick,room,cam]);
 useEffect(()=>{if(lastZoom.current===zoom||!ref.current)return;lastZoom.current=zoom;const offset=cam.position.clone().sub(ref.current.target);offset.multiplyScalar(zoom>0?.82:1.22);offset.clampLength(1.1,13);cam.position.copy(ref.current.target).add(offset);moving.current=false},[zoom,cam]);
 useFrame((_,dt)=>{if(moving.current&&ref.current){const alpha=1-Math.exp(-dt*5);cam.position.lerp(destination.current,alpha);ref.current.target.lerp(target.current,alpha);ref.current.update();if(cam.position.distanceTo(destination.current)<.005)moving.current=false}});
 return <OrbitControls ref={ref} makeDefault enablePan={false} minDistance={1.1} maxDistance={13} maxPolarAngle={Math.PI/2-.035} minPolarAngle={.001} onStart={()=>{moving.current=false}}/>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="scene-fallback">Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar. Bitte nutzen Sie den Grundriss und die Produktauswahl.</div>:this.props.children}}
export default function RoomScene(props:Props){return <SceneBoundary><Canvas shadows dpr={[1,1.7]} camera={{position:[5,4.6,6],fov:42}} gl={{antialias:true}}><color attach="background" args={['#c6cec6']}/><ambientLight intensity={.8}/><hemisphereLight args={['#fffbeb','#8a9586',1.6]}/><directionalLight position={[2,7,4]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-normalBias={.03}/><directionalLight position={[-4,3,0]} intensity={1.2}/><RoomGeometry {...props}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.25,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#bac5b9" roughness={1}/></mesh><CameraRig room={props.room} camera={props.camera} cameraTick={props.cameraTick} zoom={props.zoom}/></Canvas></SceneBoundary>}
