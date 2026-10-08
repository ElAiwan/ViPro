import { AuthError } from './validation.mjs';

export function brandTheme(value = 'default') {
  if (!['default', 'schramm'].includes(value)) throw new AuthError(400, 'INVALID_APPEARANCE', 'Bitte wählen Sie eine gültige Designvorlage.');
  return value;
}
export function defaultAppearance(theme, primary = '#247b84') {
  return theme === 'schramm'
    ? { primary:'#009cdc', secondary:'#2bad70', background:'#ffffff', heading:'#282727', font:'brand' }
    : { primary, secondary:'#517d72', background:'#f3f6f6', heading:'#163e47', font:'system' };
}
function luminance(hex) {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
// #555555 is the lightest fixed grey copy placed directly on the company background.
export function validateAppearance(value) {
  const fail = message => {throw new AuthError(400,'INVALID_APPEARANCE',message);};
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Bitte prüfen Sie das Erscheinungsbild.');
  const result={};
  for(const key of ['primary','secondary','background','heading']) {
    if(typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key])) fail('Bitte verwenden Sie gültige Farben im Format #RRGGBB.');
    result[key]=value[key].toLowerCase();
  }
  if(!['brand','system'].includes(value.font)) fail('Bitte wählen Sie eine gültige Schriftkombination.');
  if(contrast(result.heading,result.background)<4.5 || contrast(result.heading,'#ffffff')<4.5 || contrast('#555555',result.background)<4.5) fail('Bitte wählen Sie einen hellen Hintergrund und eine dunkle Überschriftenfarbe für gut lesbare Texte.');
  return {...result,font:value.font};
}
