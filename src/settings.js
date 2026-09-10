/** Saved preferences are untrusted; malformed fields fall back independently. */
export function normaliseSettings(value, prefersReducedMotion=false){
  const settings={music:.48,sfx:.65,ambience:.38,muted:false,reducedMotion:!!prefersReducedMotion,tapSweep:false,lowQuality:false};
  if(!value||typeof value!=='object'||Array.isArray(value))return settings;
  for(const key of ['music','sfx','ambience'])if(typeof value[key]==='number'&&Number.isFinite(value[key])&&value[key]>=0&&value[key]<=1)settings[key]=value[key];
  for(const key of ['muted','reducedMotion','tapSweep','lowQuality'])if(typeof value[key]==='boolean')settings[key]=value[key];
  return settings;
}
