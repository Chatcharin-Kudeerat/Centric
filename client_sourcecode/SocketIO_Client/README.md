###### install pakage ######
  command: npm install
  
###### run SocketIO client #######
  command: node client.js {filename}
  ex: node client.js 39sec.wav
  meaning: run socketio client with file '39sec.wav'
  note. {filename} will call file in /samples directory

###### run Thread SocketIO client #######
  command: node client_thread.js {number_of_thread}
  ex: node client_thread.js 150
  meaning: run socketio client with 150 thread