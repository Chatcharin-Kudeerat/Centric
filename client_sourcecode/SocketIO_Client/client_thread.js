const { Worker, isMainThread, parentPort } = require('worker_threads');
const filePath = `${__dirname}/client.js`
const { argv } = require('node:process');

if (isMainThread) {
  // Main thread
  const times = parseInt(argv[2]);
  const workerThreads = [];
  for (let i = 0; i < times; i++) {
    workerThreads.push(new Worker(filePath));
  }
  // Send a message to each worker thread
  workerThreads.forEach((worker, index) => {
    console.log(`start thread : ${index}`);
    worker.postMessage({ task: index });
  });
} else {
  // Worker thread code
  parentPort.on('message', message => {
    console.log(`Worker ${process.pid}: Received task ${message.task}`);
    performTask(message.task);
  });
  function performTask(task) {
    // operations to be performed to execute the task
  }
}