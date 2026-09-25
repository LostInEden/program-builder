import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceStorage } from '../src/lib/deviceStorage.ts';
import { diagramConcept } from '../src/lib/schemeDiagrams.ts';

test('save confirms actual writes, reports quota failure, and recovers', () => {
  let raw = null, blocked = false;
  const statuses = [];
  const storage = createDeviceStorage(() => ({
    getItem: () => raw,
    setItem: (_key, value) => { if (blocked) throw new Error('Quota exceeded'); raw = value; },
    removeItem: () => { raw = null; },
  }), value => statuses.push(value));
  assert.equal(storage.getItem('test'), null);
  assert.equal(statuses.at(-1), 'ready');
  const first = { state: { calls: [{ id: 'play', name: 'Okie' }] }, version: 14 };
  storage.setItem('test', first);
  assert.deepEqual(statuses.slice(-2), ['saving', 'saved']);
  assert.deepEqual(storage.getItem('test'), first);
  blocked = true;
  const changed = { ...first, state: { calls: [{ id: 'play', name: 'Edited' }] } };
  storage.setItem('test', changed);
  assert.equal(statuses.at(-1), 'error');
  assert.deepEqual(JSON.parse(raw), first);
  blocked = false;
  storage.setItem('test', changed);
  assert.equal(statuses.at(-1), 'saved');
  assert.deepEqual(JSON.parse(raw), changed);
});

test('unavailable storage is reported rather than falsely saved', () => {
  const statuses = [];
  const storage = createDeviceStorage(() => { throw new Error('Denied'); }, s => statuses.push(s));
  assert.throws(() => storage.getItem('test'));
  assert.equal(statuses.at(-1), 'error');
  storage.setItem('test', { state: {}, version: 14 });
  assert.equal(statuses.at(-1), 'error');
});

test('drawing links survive renames and legacy matches are unambiguous', () => {
  const front = { id: 'f', kind: 'front', name: 'Okie' };
  const coverage = { id: 'c', kind: 'coverage', name: 'Okie' };
  const call = { name: ' okie ', section: 'Fronts' };
  assert.equal(diagramConcept(call, [front, coverage]), front);
  assert.equal(diagramConcept(call, [front, { ...front, id: 'other' }]), undefined);
  assert.equal(diagramConcept({ ...call, schemeConceptId: 'f' }, [{ ...front, name: 'Renamed' }])?.id, 'f');
  assert.equal(diagramConcept({ ...call, schemeConceptId: '' }, [front]), undefined);
  assert.equal(diagramConcept({ ...call, schemeConceptId: 'deleted' }, [front]), undefined);
});
