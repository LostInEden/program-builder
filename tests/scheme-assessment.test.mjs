import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessScheme } from '../src/lib/schemeAssessment.ts';
const front = { id:'f', name:'Okie', kind:'front', confirmed:true, responsibilities:[] };
const starter = skills => ({ label:'N', unit:'DL', player:{ name:'Test Nose', skills } });
test('unknown ratings and absent rules never establish soundness', () => {
  const [f] = assessScheme([front], [starter({})]);
  assert.equal(f.status, 'Needs Review');
  assert.match(f.why, /cannot verify/);
  assert.ok(f.personnel.some(x => x.includes('not rated')));
  assert.ok(f.strengths.length && f.weaknesses.length && f.improvements.length);
});
test('individual weakness remains visible even with a strong teammate', () => {
  const [f] = assessScheme([front], [starter({blockDestruction:2, runFit:2}), {label:'E', unit:'DL', player:{name:'Strong End', skills:{blockDestruction:5, runFit:5}}}]);
  assert.equal(f.status, 'Potential Conflict');
  assert.ok(f.weaknesses.some(x => x.includes('Test Nose')));
  assert.ok(f.personnel.some(x => x.includes('supporting strength')));
});
test('strong grades and saved rules still require distribution review', () => {
  const [f] = assessScheme([{...front, responsibilities:[{role:'N', job:'A gap'}]}], [starter({blockDestruction:5, runFit:5})]);
  assert.equal(f.status, 'Needs Review');
  assert.match(f.why, /does not prove/);
});
test('back-pocket and unconfirmed calls are excluded; custom calls disclose limits', () => {
  assert.equal(assessScheme([{...front,status:'backPocket'},{...front,confirmed:false}], []).length,0);
  const [f] = assessScheme([{...front,name:'Custom Alpha'}],[]);
  assert.ok(f.weaknesses.some(x => x.includes('no recognized family')));
});
