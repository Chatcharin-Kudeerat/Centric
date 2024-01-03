#### How to run script ####
# python3.8 concurrent_test_script.py      -> Script will run 1 concurrent 
# or
# python3.8 concurrent_test_script.py 20   -> Script will run 20 concurrent

import sys
import time
import threading
import subprocess

def run_script():
    subprocess.run(["python3.8", "./main.py"])

def call_thread(number):
    threads = list()
        
    for index in range(int(number)):
        print("Create and start thread %d.", index)
        x = threading.Thread(target=run_script)
        threads.append(x)
        x.start()
        # time.sleep(1)

    for index, thread in enumerate(threads):
        thread.join()
        print("Thread %d done", index)

if __name__ == "__main__":
    args = sys.argv[1:]

    if len(args) > 0:
        if args[0].isnumeric():
            call_thread(args[0])
        else:
            subprocess.run(["echo", "2 Argument is not number"])
    else:
        call_thread(1)
