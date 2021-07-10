const { spawn } = require('child_process')

const childProcess = spawn('/home/pi/App/nscon/main')

console.log('process id:' + process.pid)
console.log('child process id:' + childProcess.pid)

childProcess.stdout.on('data', (chunk) => {
    console.log(chunk.toString())

})
childProcess.stderr.on('data', (chunk) => {
    console.log(chunk.toString())

})
start();
async function start() {
    while (true) {
        await sleep(1000);
        childProcess.stdin.write("a");
    }
}

function sleep(waitSec) {
    return new Promise(function (resolve) {
        setTimeout(function () { resolve() }, waitSec);
    });
}