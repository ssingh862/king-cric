import test from 'node:test';
import assert from 'node:assert/strict';
import { brandPalettes } from '../src/lib/brandPalettes';
function luminance(hex:string){const rgb=hex.slice(1).match(/../g)!.map(part=>parseInt(part,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('every brand combination has readable buttons, headings and preview metadata',()=>{for(const [id,p] of Object.entries(brandPalettes)){assert.ok(contrast('#FFFFFF',p.primary)>=4.5,`${id}: white button label`);assert.ok(contrast(p.accent,p.deep)>=7,`${id}: hero heading`);assert.ok(contrast(p.muted,p.deep)>=4.5,`${id}: hero metadata`);assert.ok(contrast(p.primary,p.tint)>=4.5,`${id}: tinted card label`);}});
