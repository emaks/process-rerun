const path = require('path')
const fs = require('fs')
const {exec} = require('child_process')

const argv = require('minimist')(process.argv.slice(2));

const sleep = (time) => new Promise(res => setTimeout(res, time))


let stdOutAnalize = (stack) => true
let maxSession = argv.sessionsCount || 5
let rerunCount = argv.count || 2
let configFilePath = argv.configPath || path.resolve(process.cwd(), './protractor.conf.js')

let currentSessionCount = 0


const walkSync = function(dir, filelist = []) {
  const files = fs.readdirSync(dir)

  files.forEach(function(file) {
    if(fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist)
    }
    else {filelist.push(path.join(dir, file))}
  })
  return filelist
}

const specsDir = path.resolve(__dirname, './specs')

let getRunCommand = (file) => `${path.resolve(process.cwd(), './node_modules/.bin/protractor')} ${configFilePath} --specs ${file}`


const runPromise = (cmd) => new Promise((res) => {
  const now = +Date.now(); const longestTest = 450000
  const proc = exec(cmd)
  let fullStack = ''
  const watcher = setInterval(() => {if(+Date.now() - now > longestTest) {clearInterval(watcher); proc.kill(); res(cmd)} }, 15000)

  proc.on('exit', () => {clearInterval(watcher)})
  proc.stdout.on('data', (data) => {fullStack += data.toString()})

  proc.on('close', (code) => {
    if(code !== 0 && stdOutAnalize(fullStack)) {
      res(cmd)
    } res(null)
  })
})

async function exeRun(runArr, failArr = []) {
  runArr = runArr || walkSync(specsDir).map(getRunCommand)

  let currentSubRun = 0
  async function performRun(runSuits, failedRun) {

    let asserter = null
    function tryRerun(runsArr, pushArr) {
      const upperRun = async () => {
        const runArr = runsArr.splice(0, maxSession - currentSessionCount).map(run => runPromise(run))
        currentSubRun += runArr.length
        currentSessionCount += currentSubRun
        await Promise.all(runArr).then((cmd) => {
          pushArr.push(...cmd.filter(cm => !!cm))
          currentSubRun -= runArr.length
          currentSessionCount -= currentSubRun
        }).catch(console.error)
      }
      upperRun()
      asserter = setInterval(upperRun, 10000)
    }

    tryRerun()

    do {
      const runMap = runSuits.splice(0, maxSession - currentSessionCount).map(run => runPromise(run))
      currentSessionCount += runMap.length
      await Promise.all(runMap).then((cmds) => {
        failedRun.push(...cmds.filter(cm => !!cm))
        currentSessionCount -= runMap.length
      }).catch(e => console.error(e.toString()))

      if(runSuits.length) {await sleep(3000)}
    } while(runSuits.length || currentSubRun)

    clearInterval(asserter)
    return failedRun
  }

  const failedTests = await new Array(rerunCount).join('_').split('_').reduce((resolver) => {
    return resolver.then(resolvedArr => performRun(resolvedArr, []).then(failedArr => failedArr))
  }, Promise.resolve(runArr))

  console.log(failedTests.length, 'Failed test count')
  return failedTests
}


module.exports = {
  getReruner: function({maxSession = 5, rerunCount = 2, stackAnalize = (stack) => true}) {
    maxSession = maxSession; rerunCount = rerunCount; stdOutAnalize = stackAnalize
    return exeRun
  },
  getSpecCommands: function(pathToSpecDir, getRunCommandPattern) {
    return walkSync(pathToSpecDir).map(getRunCommandPattern)
  }
}