import type { RoomId,Item,Selection,CameraView } from './catalog.ts';
export interface State {room:RoomId|null;mode:'plan'|'3d';selected:Item|null;camera:CameraView;cameraTick:number;variants:Record<RoomId,Selection>}
const defaults=():Selection=>({mirror:0,vanity:0,toilet:0,shower:0,tub:0,radiator:0});
export const initialState:State={room:null,mode:'plan',selected:null,camera:'overview',cameraTick:0,variants:{modern:defaults(),nature:defaults(),design:defaults()}};
export type Action={type:'room';id:RoomId}|{type:'home'}|{type:'back'}|{type:'mode';mode:'plan'|'3d'}|{type:'camera';camera:CameraView}|{type:'select';item:Item|null}|{type:'variant';item:Item;index:number};
export function reducer(state:State,action:Action):State{
 switch(action.type){
 case 'room':return {...state,room:action.id,mode:'plan',selected:null,camera:'overview'};
 case 'home':return {...state,room:null,selected:null};
 case 'mode':return {...state,mode:action.mode};
 case 'select':return {...state,selected:action.item};
 case 'camera':return {...state,camera:action.camera,mode:'3d',cameraTick:state.cameraTick+1};
 case 'variant':return state.room?{...state,variants:{...state.variants,[state.room]:{...state.variants[state.room],[action.item]:action.index}}}:state;
 case 'back':return state.selected?{...state,selected:null}:state.mode==='3d'?{...state,mode:'plan'}:{...state,room:null};
 }
}
