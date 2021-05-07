let startTime = 0;
const DebugMode = false;

function Success(...args: any[]) {
  const currentTime = (new Date().getTime() - startTime);
  const data = args.join(" ");

  if(DebugMode) {
    const e = new Error();
    const frame = e.stack?.split("\n")[2];
    const tracking = frame?.split(" ")[5] + ":" + frame?.split(":")[frame?.split(":").length - 2];
    console.log(`\x1b[42m\x1b[37m[√ - ${currentTime} - ${tracking}]\x1b[0m\x1b[32m ${data}\x1b[0m`);
  } else console.log(`\x1b[42m\x1b[37m[√]\x1b[0m\x1b[32m ${data}\x1b[0m`);
}

function Info(...args: any[]) {
  const currentTime = new Date().getTime() - startTime;
  const data = args.join(" ");

  if(DebugMode) {
    const e = new Error();
    const frame = e.stack?.split("\n")[2];
    const tracking = frame?.split(" ")[5] + ":" + frame?.split(":")[frame?.split(":").length - 2];

    console.log(`\x1b[44m\x1b[37m[i - ${currentTime} - ${tracking}]\x1b[0m\x1b[36m ${data}\x1b[0m`);
  } else console.log(`\x1b[44m\x1b[37m[i]\x1b[0m\x1b[36m ${data}\x1b[0m`);
}

function Warning(...args: any[]) {
  const currentTime = new Date().getTime() - startTime;
  const data = args.join(" ");

  if(DebugMode) {
    const e = new Error();
    const frame = e.stack?.split("\n")[2];
    const tracking = frame?.split(" ")[5] + ":" + frame?.split(":")[frame?.split(":").length - 2];

    console.log(`\x1b[43m\x1b[30m[i - ${currentTime} - ${tracking}]\x1b[0m\x1b[33m ${data}\x1b[0m`);
  } else console.log(`\x1b[43m\x1b[30m[i]\x1b[0m\x1b[33m ${data}\x1b[0m`);
}

function Failure(...args: any[]) {
  const currentTime = new Date().getTime() - startTime;
  const data = args.join(" ");

  if(DebugMode) {
    const e = new Error();
    const frame = e.stack?.split("\n")[2];
    const tracking = frame?.split(" ")[5] + ":" + frame?.split(":")[frame?.split(":").length - 2];

    console.log(`\x1b[41m\x1b[37m[x - ${currentTime} - ${tracking}]\x1b[0m\x1b[31m ${data}\x1b[0m`);
  } else console.log(`\x1b[41m\x1b[37m[x]\x1b[0m\x1b[31m ${data}\x1b[0m`);
}

function ResetTiming() {
  startTime = new Date().getTime();
}

export {
  Info,
  Failure,
  Success,
  Warning,
  ResetTiming
};