import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyboardControls } from '../src/keyboard.js';
import { createState, tick, buyUpgrade, assignCrew } from '../src/game.js';

function fixture() {
 const state=createState(),canvas={ownerDocument:{activeElement:null}},notices=[],assignments=[],pans=[];canvas.ownerDocument.activeElement=canvas;
 let keyboard;
 keyboard=createKeyboardControls({canvas,getState:()=>state,renderer:{scale:.7},onMode:mode=>{keyboard.stop();state.mode=mode;},onAssign:(x,y)=>{assignments.push({x,y});return assignCrew(state,x,y);},onPan:(x,y)=>pans.push({x,y}),onNotice:message=>notices.push(message)});
 const key=(key,extras={})=>keyboard.handleKeyDown({key,...extras});
 const advance=seconds=>{for(let t=0;t<seconds;t+=.05){keyboard.update(.05);tick(state,.05);}};
 return {state,canvas,keyboard,key,advance,notices,assignments,pans};
}

test('keyboard route creates helpers, earns an upgrade, and assigns the crew',()=>{
 const f=fixture();f.key('n');f.key(' ');
 for(let segment=0;segment<10&&f.state.motes<32;segment++){f.advance(5);f.key('n');}
 assert.ok(f.state.creatures.length>0);assert.ok(f.state.firstHelperAt<=30);assert.ok(f.state.motes>=32);
 assert.equal(buyUpgrade(f.state,'teamwork'),true);
 f.keyboard.stop();f.state.mode='direct';f.key('n');f.key('Enter');
 assert.equal(f.assignments.length,1);assert.deepEqual(f.state.assignment,f.assignments[0]);
});

test('Space toggles without repeating, and focus loss stops every held action',()=>{
 const f=fixture();f.key(' ');assert.equal(f.state.pointer.active,true);f.key(' ',{repeat:true});assert.equal(f.state.pointer.active,true);
 f.key('ArrowRight');f.canvas.ownerDocument.activeElement={};f.keyboard.update(.05);assert.equal(f.state.pointer.active,false);
 const x=f.state.pointer.x;f.canvas.ownerDocument.activeElement=f.canvas;f.advance(.2);assert.equal(f.state.pointer.x,x);
 assert.equal(f.key(' ',{ctrlKey:true}),false);
});

test('arrow taps move cursor, held arrows remain bounded, Shift delegates pan',()=>{
 const f=fixture();const before=f.state.pointer.x;f.key('ArrowRight');assert.ok(f.state.pointer.x>before);
 f.advance(20);assert.ok(f.state.pointer.x<=887);f.keyboard.handleKeyUp({key:'ArrowRight'});
 f.key('ArrowUp',{shiftKey:true});assert.deepEqual(f.pans,[{x:0,y:-42}]);
 const fixed=f.state.pointer.y;f.advance(.2);assert.equal(f.state.pointer.y,fixed);
});

test('N announces only explicit requests and works when every dust patch is clear',()=>{
 const f=fixture();f.key('n');const count=f.notices.length;f.advance(2);assert.equal(f.notices.length,count);
 f.key('n',{repeat:true});assert.equal(f.notices.length,count);
 f.state.dust.forEach(d=>d.amount=0);f.key('n');assert.match(f.notices.at(-1),/Every dust patch is clear/);
});
