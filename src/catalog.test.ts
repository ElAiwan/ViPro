import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer } from './state.ts';
test('a room opens on the plan and camera opens 3D', () => {
 let s = reducer(initialState, {type:'room',id:'modern'});
 assert.equal(s.mode,'plan');
 s = reducer(s,{type:'camera',camera:'vanity'});
 assert.equal(s.mode,'3d'); assert.equal(s.camera,'vanity');
});
test('variants remain independent between bathrooms and survive home navigation', () => {
 let s=reducer(initialState,{type:'room',id:'modern'});
 s=reducer(s,{type:'variant',item:'mirror',index:2});
 s=reducer(s,{type:'home'});
 s=reducer(s,{type:'room',id:'nature'});
 assert.equal(s.variants.nature.mirror,0);
 s=reducer(s,{type:'room',id:'modern'});
 assert.equal(s.variants.modern.mirror,2);
});
test('back closes product first, then returns from 3D to plan, then home',()=>{
 let s=reducer(initialState,{type:'room',id:'modern'});
 s=reducer(s,{type:'camera',camera:'entrance'});
 s=reducer(s,{type:'select',item:'toilet'});
 s=reducer(s,{type:'back'}); assert.equal(s.selected,null); assert.equal(s.mode,'3d');
 s=reducer(s,{type:'back'}); assert.equal(s.mode,'plan');
 s=reducer(s,{type:'back'}); assert.equal(s.room,null);
});
