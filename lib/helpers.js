const fs = require('fs');
const path = require('path');

/**
 * Current example for process-rerun with protractor framework
 * getFormedRunCommand('./spec/test.file.spec.js', './protractor.conf.js')
 *
 * @param {string} file path to spec file
 * @param {string} conf path to config file
 * @returns {string}
 */
const getFormedRunCommand = (file, conf = path.resolve(process.cwd(), './protractor.conf.js')) => {
  return `${path.resolve(process.cwd(), './node_modules/.bin/protractor')} ${conf} --specs ${file}`;
};

/**
 * @param {string} dir a path to the director what should be read
 * @param {array<string>} fileList option, empty array what will contains all files
 * @param {array<string>} directoryToSkip option, directories what should be exclude from files list
 * @returns {array<string>}
 */
const getFilesArray = function(dir, fileList = [], directoryToSkip = []) {
  const files = fs.readdirSync(dir);
  files.forEach(function(file) {
    const isDirr = fs.statSync(path.join(dir, file)).isDirectory();
    const shouldBeExcluded =
      (Array.isArray(directoryToSkip) && directoryToSkip.includes(file)) ||
      (typeof directoryToSkip === 'string' && file.includes(directoryToSkip)) ||
      (directoryToSkip instanceof RegExp && file.match(directoryToSkip));

    if (shouldBeExcluded) {
      return;
    }

    if (isDirr) {
      fileList = getFilesArray(path.join(dir, file), fileList, directoryToSkip);
    } else {
      fileList.push(path.join(dir, file));
    }
  });
  return fileList;
};

/**
 * @param {any|number} timeValue time for polling interval in setInterval
 * @returns {number}
 */
const getPollTime = (timeValue) => {
  if (typeof timeValue === 'number') {
    return timeValue;
  }
  console.warn('"pollingInterval" parameter should be a number, will be used default value: 1 second');
  return 1000;
};

/**
 * @param {any|number} sessionCountValue
 * @returns {number}
 */
const getMaxSessionCount = (sessionCountValue) => {
  if (typeof sessionCountValue === 'number') {
    return sessionCountValue;
  }
  console.warn('"sessionCount" parameter should be a number, will be used default value: 5');
  return 5;
};

/**
 * @param {any|number} retryCountValue
 * @returns {number}
 */
const getRetryCount = (retryCountValue) => {
  if (typeof retryCountValue === 'number') {
    return retryCountValue;
  }
  console.warn('"retryCount" parameter should be a number, will be used default value: 1');
  return 1;
};

/**
 * @param {any|number} processTimeValue
 * @returns {number}
 */
const getLongestProcessTime = (processTimeValue) => {
  if (typeof processTimeValue === 'number') {
    return processTimeValue;
  }
  console.warn('"longestProcessTime" parameter should be a number, will be used default value: 10 min');
  return 10 * 60 * 1000;
};

/**
 * await sleep(5000)
 * @param {number} time
 */
const sleep = (time) => new Promise((res) => setTimeout(res, time));

const returnStringType = (arg) => Object.prototype.toString.call(arg);

module.exports = {
  getFilesArray,
  getFormedRunCommand,
  getLongestProcessTime,
  getMaxSessionCount,
  getPollTime,
  getRetryCount,
  returnStringType,
  sleep,
};
