const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(html, /const gameAudio = \(\(\) =>/);
assert.match(html, /api\.startBgm\s*=\s*\(\)\s*=>/);
assert.match(html, /api\.sfx\s*=\s*\(name,opts=\{\}\)\s*=>/);
assert.match(html, /bgmStepDuration:60\/128\/4/);
assert.match(html, /api\._chord=\(notes,when\)=>/);
assert.match(html, /api\._kick=\(when,accent=1\)=>/);
assert.match(html, /api\._snare=\(when,accent=1\)=>/);
assert.match(html, /api\._hat=\(when,open=false\)=>/);
assert.match(html, /api\.bgmStep\+\+%128/);
assert.match(html, /AudioContext\|\|window\.webkitAudioContext/);
for (const event of ['shoot', 'sub', 'explode', 'jump', 'kill', 'death', 'special', 'countdown', 'matchEnd']) {
  assert.match(html, new RegExp("case ['\\\"]" + event + "['\\\"]"));
}
assert.match(html, /id="bgmVolume"/);
assert.match(html, /id="sfxVolume"/);
assert.match(html, /id="audioMuteBtn"/);
assert.match(html, /localStorage\.setItem\('ink-bgm-volume'/);
assert.match(html, /localStorage\.setItem\('ink-sfx-volume'/);

console.log('Audio system test passed: synthesized BGM, SFX routing, settings, and unlock hooks.');
