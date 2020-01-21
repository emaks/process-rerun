const {buildExecRunner} = require('./execProc');
const {buildSpawnRunner} = require('./spawnProc');

function buildCommandExecutor(failedByAssert, {spawn, ...runOptions}) {
  if (spawn) {
    return buildSpawnRunner(failedByAssert, runOptions);
  }
  return buildExecRunner(failedByAssert, runOptions);
}

module.exports = {
  buildCommandExecutor
};
