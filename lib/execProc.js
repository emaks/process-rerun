const {exec} = require('child_process');
const {returnStringType} = require('./helpers');

function millisecondsToMinutes(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
  return (seconds === '60' ? (minutes + 1) + ':00' : minutes + ':' + (seconds < 10 ? '0' : '') + seconds);
}

function buildExecRunner(failedByAssert, runOptions) {
  const {
    execOptions,
    debugProcess,
    stackAnalyze,
    reformatCommand,
    longestProcessTime,
    currentExecutionVariable,
    addSpecificOptionsBeforeRun,
  } = runOptions;

  return (cmd, index) => new Promise((resolve) => {
    let additionalOptions = null;
    let specificCallback = null;
    let executionStack = '';
    /**
     * @now this variable will be used for process kill if time more than @longestProcessTime
     */
    const startTime = +Date.now();

    /**
     * @param {undefined|function} addSpecificOptions if function cmd will go to this function as argument
     */
    if (addSpecificOptionsBeforeRun) {
      const originalCmd = cmd;
      const cmdObj = addSpecificOptionsBeforeRun(cmd);
      cmd = cmdObj.cmd;
      specificCallback = cmdObj.cmdExecutableCB;
      additionalOptions = cmd.replace(originalCmd, '');
    }

    if (currentExecutionVariable) {
      if (cmd.includes(currentExecutionVariable)) {
        cmd = cmd.replace(new RegExp(`${currentExecutionVariable}=\\d+`, 'ig'), `${currentExecutionVariable}=${index}`);
      } else {
        cmd = `${currentExecutionVariable}=${index} ${cmd}`;
      }
    }

    const execProcess = exec(cmd, execOptions, (error, stdout, stderr) => {
      if (debugProcess) {
        console.log('___________________________________________________________________________');
        console.log(`command for process:  ${cmd}`);
        console.log(`process duration: ${millisecondsToMinutes(+Date.now() - startTime)}`);
        console.log(`PID: ${execProcess.pid}`);
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        console.error(`error: ${error}`);
        console.log('___________________________________________________________________________');
      }
      executionStack += `${stdout}${stderr}`;
    });

    const killTooLongExecution = (procWhatShouldBeKilled) => {
      const executionTime = +Date.now() - startTime;
      if (executionTime > longestProcessTime) {
        if (debugProcess) {
          console.log(`PID: ${execProcess.pid} killed due to long time execution: ${millisecondsToMinutes(executionTime)}`);
        }
        procWhatShouldBeKilled.kill();
      }
    };

    const watcher = setInterval(() => killTooLongExecution(execProcess), 5000);

    execProcess.on('exit', (code, signal) => {
      if (debugProcess) {
        console.log(`EXIT PROCESS: PID="${execProcess.pid}", code="${code}" and signal="${signal}"`);
      }
    });

    execProcess.on('error', (e) => {
      if (debugProcess) {
        console.log(`ERROR PROCESS: PID="${execProcess.pid}"`);
      }
      console.error(e);
    });

    execProcess.on('close', async (code, signal) => {
      if (debugProcess) {
        console.log(`CLOSE PROCESS: PID="${execProcess.pid}", code="${code}" and signal="${signal}"`);
      }

      let commandToRerun = null;

      // if process code 0 - exit as a success result
      if (code !== 0) {
        // stackAnalyze - check that stack contains or not contains some specific data
        if (stackAnalyze && stackAnalyze(executionStack)) {
          commandToRerun = cmd;
        } else if (reformatCommand) {
          commandToRerun = reformatCommand(cmd, executionStack, failedByAssert);
        } else {
          failedByAssert.push(cmd);
        }

        if (specificCallback) {
          if (specificCallback.then || returnStringType(specificCallback) === '[object AsyncFunction]') {
            await specificCallback();
          } else {
            specificCallback();
          }
        }

        // addSpecificOptionsBeforeRun was defined - we should remove useless opts what will be added in next iteration
        if (additionalOptions && commandToRerun) {
          commandToRerun = commandToRerun.replace(additionalOptions, '');
        }
      }

      // clear watcher interval
      clearInterval(watcher);

      resolve(commandToRerun);
    });
  });
}

module.exports = {
  buildExecRunner
};
