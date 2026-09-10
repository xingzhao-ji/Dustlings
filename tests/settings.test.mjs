import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseSettings} from '../src/settings.js';
test('invalid settings fields cannot create NaN labels or truthy false preferences',()=>{
 const settings=normaliseSettings({music:'loud',sfx:-8,ambience:null,muted:'false',reducedMotion:'false',tapSweep:'false',lowQuality:'false',injected:'unused'});
 assert.deepEqual(settings,{music:.48,sfx:.65,ambience:.38,muted:false,reducedMotion:false,tapSweep:false,lowQuality:false});
});
test('valid zero/full volumes and explicit motion choices survive normalization',()=>{
 assert.deepEqual(normaliseSettings({music:0,sfx:1,ambience:.15,muted:true,reducedMotion:false,tapSweep:true,lowQuality:true},true),{music:0,sfx:1,ambience:.15,muted:true,reducedMotion:false,tapSweep:true,lowQuality:true});
});
test('invalid containers and nonfinite volumes retain independent accessible defaults',()=>{
 for(const value of [null,undefined,[],false,'text',2])assert.equal(normaliseSettings(value,true).reducedMotion,true);
 for(const value of [NaN,Infinity,-Infinity,1.01,-.01])assert.equal(normaliseSettings({music:value,sfx:.3}).music,.48);
 assert.equal(normaliseSettings({music:NaN,sfx:.3}).sfx,.3);
});
