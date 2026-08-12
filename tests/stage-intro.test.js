const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(/id="stageIntro"/.test(html), 'stage intro overlay must be present');
assert(/function beginStageIntro\(startAt=Date\.now\(\)\)/.test(html), 'stage intro must support a synchronized start time');
assert(/function introCameraPose\(elapsed\)/.test(html), 'stage intro must animate a camera path');
assert(/function finishStageIntro\(\)/.test(html) && /camera\.fov=stageIntroPrevFov/.test(html), 'intro must restore gameplay camera state');
assert(/if \(stageIntroActive\) updateStageIntro\(\)/.test(html), 'intro animation must run outside the gameplay loop');
assert(/startMatch\(m\.startAt\|\|Date\.now\(\)\)/.test(html), 'online guests must use the host start timestamp');
assert(/startAt=Date\.now\(\)\+450/.test(html), 'online host must broadcast a short synchronized lead-in');
assert(/stageIntroActive && !e\.repeat/.test(html), 'stage intro must be skippable with keyboard input');

console.log('Stage intro test passed.');
