const {buildCommandExecutor} = require('./commandExecutorBuilder');
const {sleep, getFormedRunCommand, getFilesArray, getPollTime} = require('./helpers');

function reRunnerBuilder(runOptions) {

  const failedByAssert = [];
  let currentSessionCount = 0;

  let {attemptsCount} = runOptions;
  const {
    stackAnalize,
    grepWord,
    debugProcess,
    reformatCommand,
    intervalPoll,
    everyCycleCallback,
    specsDir,
    longestProcessTime,
    spawn,
    formCommanWithOption: addSpecificOptionsBeforeRun,
    currentExecutionVariable
  } = runOptions;

  // maxSessionCount should be "let", because it will increment and decrement
  let {maxSessionCount} = runOptions;

  /**
   * @param {string} cmd command what should be executed
   * @returns {Promise<string>|Promise<null>} return null if command executed successful or cmd if something went wrong
   */

  const executeCommandAsync = buildCommandExecutor(failedByAssert, {
    spawn,
    addSpecificOptionsBeforeRun,
    currentExecutionVariable,
    longestProcessTime,
    debugProcess,
    reformatCommand,
    stackAnalize
  });


  async function reRunner(commandsArray) {
    // if run arr was not defined as argument commandsArray will defined as default array
    commandsArray = (commandsArray || getFilesArray(specsDir)
      .map((file) => getFormedRunCommand(file)))
      .filter(function(cmd) {
        return cmd.includes(grepWord);
      });

    if (debugProcess) {
      console.log(`Attempts count is: ${attemptsCount}`);
    }

    if (typeof attemptsCount !== 'number') {
      console.warn('attemptsCount should be a number, 2 will be used as a default');
      attemptsCount = 2;
    }

    const failedCommands = await new Array(attemptsCount)
      // create array with current length
      .fill(attemptsCount)
      // execute run
      .reduce((resolver, /*current*/ current, index) => {

        if (debugProcess) {
          console.info('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
          console.info(`Execution number: ${index}`);
          console.info('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        }

        return resolver.then((resolvedCommandsArray) => {
          if (debugProcess) {
            console.info('=========================================================================');
            console.info(`Processes count: ${resolvedCommandsArray.length}`);
            console.info('=========================================================================');
          }
          return runCommands(resolvedCommandsArray, [], index)

            .then((failedCommandsArray) => {
              return failedCommandsArray;
            });
        });
      }, Promise.resolve(commandsArray));

    /**
     * @param {Array} commands command array what should be executed
     * @param {Array} commandsToRerun array what will contains failed commands
     * @returns {void}
     */

    async function runCommand(commands, commandsToRerun, executionIndex) {
      if (maxSessionCount > currentSessionCount && commands.length) {
        currentSessionCount += 1;
        const result = await executeCommandAsync(commands.splice(0, 1)[0], executionIndex).catch(console.error);
        if (result) {
          commandsToRerun.push(result);
        }
        currentSessionCount -= 1;
      }
    }

    async function runCommands(commands, commandsToRerun, executionIndex) {
      const executor = setInterval(() => runCommand(commands, commandsToRerun, executionIndex), intervalPoll);

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

    const combinedFailedProcesses = [...failedCommands, ...failedByAssert];

    console.log('Failed processes count:', combinedFailedProcesses.length);

    return {
      failedCommands,
      failedByAssert
    };
  }

  return reRunner;
}

module.exports = {
  buildExeRun: ({
                  maxSessionCount = 5,
                  attemptsCount = 2,
                  stackAnalize,
                  everyCycleCallback,
                  reformatCommand,
                  grepWord = '',
                  longestProcessTime = 450000,
                  debugProcess = false,
                  formCommanWithOption,
                  pollTime = 1000,
                  currentExecutionVariable,
                  spawn = false
                } = {}) => {

    const reformattedArgs = {
      formCommanWithOption,
      debugProcess,
      longestProcessTime,
      maxSessionCount,
      attemptsCount,
      reformatCommand,
      stackAnalize,
      grepWord,
      spawn,
      currentExecutionVariable,
      everyCycleCallback,
      intervalPoll: getPollTime(pollTime)
    };

    return reRunnerBuilder(reformattedArgs);
  },
  sleep,
  walkSync: getFilesArray,
  getRunCommand: getFormedRunCommand
};
