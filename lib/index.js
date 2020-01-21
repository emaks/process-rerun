const {buildCommandExecutor} = require('./commandExecutorBuilder');
const {
  getFilesArray,
  getFormedRunCommand,
  getLongestProcessTime,
  getMaxSessionCount,
  getPollTime,
  getRetryCount,
  sleep,
} = require('./helpers');

function reRunnerBuilder(runOptions) {
  const failedByAssert = [];
  let currentSessionCount = 0;
  const {
    spawn,
    specsDir,
    grepWord,
    retryCount,
    execOptions,
    debugProcess,
    stackAnalyze,
    maxSessionCount,
    reformatCommand,
    pollingInterval,
    everyCycleCallback,
    longestProcessTime,
    currentExecutionVariable,
    addSpecificOptionsBeforeRun,
  } = runOptions;

  /**
   * @param {string} cmd command what should be executed
   * @returns {Promise<string>|Promise<null>} return null if command executed successful or cmd if something went wrong
   */
  const executeCommandAsync = buildCommandExecutor(
    failedByAssert,
    {
      spawn,
      execOptions,
      debugProcess,
      stackAnalyze,
      reformatCommand,
      longestProcessTime,
      currentExecutionVariable,
      addSpecificOptionsBeforeRun,
    }
  );

  /**
   * @param {string[]} commandsArray
   * @returns {Promise<{failedCommands: string[], failedByAssert: string[]}>}
   */
  async function reRunner(commandsArray) {
    // if run arr was not defined as argument commandsArray will defined as default array
    commandsArray = (commandsArray || getFilesArray(specsDir).map((file) => getFormedRunCommand(file)))
      .filter(function(cmd) {
        return cmd.includes(grepWord);
      });

    if (debugProcess) {
      console.log(`Retry count is: ${retryCount}`);
    }

    // create array with current length and execute run
    const commandsToRerun = await [...new Array(retryCount + 1).keys()].reduce((resolver, current, index) => {
      return resolver.then((resolvedCommandsArray) => {
        if (debugProcess) {
          console.info('=========================================================================');
          console.info(`Processes count: ${resolvedCommandsArray.length}`);
          console.info('=========================================================================');
        }
        return runCommands(resolvedCommandsArray, index).then((commandsToRerunArray) => commandsToRerunArray);
      });
    }, Promise.resolve(commandsArray));

    /**
     * @param {Array} commands command array what should be executed
     * @param {Array} commandsToRerun array with commands that can be reran
     * @param executionIndex
     * @returns {void}
     */
    async function runCommand(commands, commandsToRerun, executionIndex) {
      if (maxSessionCount > currentSessionCount && commands.length) {
        currentSessionCount += 1;
        const commandToRerun = await executeCommandAsync(commands.splice(0, 1)[0], executionIndex);
        if (commandToRerun) {
          commandsToRerun.push(commandToRerun);
        }
        currentSessionCount -= 1;
      }
    }

    /**
     * @param commands
     * @param executionIndex
     * @returns {Promise<Array>}
     */
    async function runCommands(commands, executionIndex) {
      const commandsToRerun = [];
      const executor = setInterval(() => runCommand(commands, commandsToRerun, executionIndex), pollingInterval);

      do {
        if (commands.length) {
          await runCommand(commands, commandsToRerun, executionIndex);
        }
        if (currentSessionCount) {
          await sleep(2000);
        }
      } while (commands.length || currentSessionCount);

      if (everyCycleCallback && typeof everyCycleCallback === 'function') {
        try {
          await everyCycleCallback();
        } catch (e) {
          console.log(e);
        }
      }

      clearInterval(executor);
      return commandsToRerun;
    }

    const combinedFailedProcesses = [...commandsToRerun, ...failedByAssert];
    console.log('Failed processes count:', combinedFailedProcesses.length);

    return {failedCommands: commandsToRerun, failedByAssert};
  }

  return reRunner;
}

module.exports = {
  buildExeRun: (
    {
      spawn = false,
      specsDir = './specs',
      grepWord = '.spec',
      attemptsCount,
      execOptions = {maxBuffer: 1000 * 1024},
      debugProcess = false,
      stackAnalize: stackAnalyze,
      maxSessionCount,
      reformatCommand,
      pollTime,
      everyCycleCallback,
      longestProcessTime,
      currentExecutionVariable,
      formCommanWithOption: addSpecificOptionsBeforeRun,
    } = {}
  ) => {
    const reformattedArgs = {
      spawn,
      specsDir,
      grepWord,
      retryCount: getRetryCount(attemptsCount),
      execOptions,
      debugProcess,
      stackAnalyze,
      maxSessionCount: getMaxSessionCount(maxSessionCount),
      reformatCommand,
      pollingInterval: getPollTime(pollTime),
      everyCycleCallback,
      longestProcessTime: getLongestProcessTime(longestProcessTime),
      currentExecutionVariable,
      addSpecificOptionsBeforeRun,
    };

    return reRunnerBuilder(reformattedArgs);
  },
  sleep,
  walkSync: getFilesArray,
  getRunCommand: getFormedRunCommand
};
