import test from 'node:test';
import assert from 'node:assert/strict';
import {zonedToUtc,zonedDate,zonedTime,zonedLongDay,addDays} from '../lib/operations/time';
test('conference wall time converts to the right instant in any zone, including DST',()=>{
 assert.equal(zonedToUtc('2026-11-12','13:30','Asia/Qatar'),'2026-11-12T10:30:00.000Z');
 assert.equal(zonedToUtc('2026-11-12','00:15','Asia/Qatar'),'2026-11-11T21:15:00.000Z');
 assert.equal(zonedToUtc('2026-03-29','09:00','Europe/London'),'2026-03-29T08:00:00.000Z','after spring-forward');
 assert.equal(zonedToUtc('2026-03-28','09:00','Europe/London'),'2026-03-28T09:00:00.000Z','before spring-forward');
 assert.equal(zonedToUtc('2026-11-01','08:00','America/New_York'),'2026-11-01T13:00:00.000Z','after fall-back');
 assert.equal(zonedDate('2026-11-11T21:15:00.000Z','Asia/Qatar'),'2026-11-12');
 assert.equal(zonedTime('2026-11-12T10:30:00.000Z','Asia/Qatar'),'13:30');
 assert.equal(addDays('2026-11-30',2),'2026-12-02');
});
test('staff header date uses the conference zone, not the device zone',()=>{
 assert.equal(zonedLongDay(Date.parse('2026-10-10T08:00:00Z'),'Asia/Qatar'),'Saturday 10 October');
 assert.equal(zonedLongDay(Date.parse('2026-10-10T21:30:00Z'),'Asia/Qatar'),'Sunday 11 October','after midnight in Doha, still Saturday in UTC');
});
