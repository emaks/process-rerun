const {buildExecRunner} = require('./execProc');
const {buildSpawnRunner} = require('./spawnProc');

function buildCommandExecutor(failedByAssert, {spawn = false, ...runOptions}) {
  if (spawn) {
    return buildSpawnRunner(failedByAssert, runOptions);
  } else {
    return buildExecRunner(failedByAssert, runOptions);
  }
}

module.exports = {
  buildCommandExecutor
};
