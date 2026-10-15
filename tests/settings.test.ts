import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessTournament,isScoringMutation,validSession } from '../server/src/domain/access';
import { translate,messages } from '../src/i18n/catalog';
import { validateRules } from '../server/src/domain/scoring';
test('delegated scorers cannot manage tournaments or delete matches',()=>{
 assert.equal(canAccessTournament('owner','scorer','viewer',['scorer'],true),true);
 assert.equal(canAccessTournament('owner','scorer','viewer',['scorer'],false),false);
 assert.equal(isScoringMutation('DELETE','/match-1',{}),false);
 assert.equal(isScoringMutation('PATCH','/match-1',{rules:{widePenaltyRuns:0}}),false);
 assert.equal(isScoringMutation('POST','/',{tournament_id:'t'}),false);
 assert.equal(isScoringMutation('PATCH','/match-1',{status:'live'}),true);
 assert.equal(isScoringMutation('DELETE','/score-events/ball-1',{}),true);
 assert.equal(isScoringMutation('POST','/innings/i/score-events',{}),true);
});
test('owner and admin access never grants unrelated viewers control',()=>{
 assert.equal(canAccessTournament('owner','owner','viewer',[],false),true);
 assert.equal(canAccessTournament('owner','admin','admin',[],false),true);
 assert.equal(canAccessTournament('owner','other','organizer',[],true),false);
});
test('revoked and suspended sessions are rejected, legacy sessions only work before first revocation',()=>{
 assert.equal(validSession(undefined,0,false),true);
 assert.equal(validSession(undefined,1,false),false);
 assert.equal(validSession(2,3,false),false);
 assert.equal(validSession(3,3,false),true);
 assert.equal(validSession(3,3,true),false);
});
test('all language catalog entries contain Hindi and Gujarati translations',()=>{
 for(const [key,translations] of Object.entries(messages)){
  assert.equal(translations.length,2,key);
  assert.match(translations[0],/[\u0900-\u097f]/,key);
  assert.match(translations[1],/[\u0a80-\u0aff]/,key);
 }
 assert.equal(translate('Settings','hi'),'सेटिंग्स');
 assert.equal(translate('Settings','gu'),'સેટિંગ્સ');
 assert.equal(translate('Settings','en'),'Settings');
 assert.equal(translate('Sandeep XI','gu'),'Sandeep XI');
});
test('scoring defaults sanitize unknown keys and reject invalid persisted rules',()=>{
 assert.equal(validateRules({widePenaltyRuns:0,admin:true}).widePenaltyRuns,0);
 assert.equal('admin' in validateRules({admin:true}),false);
 assert.throws(()=>validateRules({noBallPenaltyRuns:10}));
 assert.throws(()=>validateRules({allowByes:'yes'}));
});
