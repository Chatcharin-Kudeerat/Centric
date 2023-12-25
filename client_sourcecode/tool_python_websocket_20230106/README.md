# Python_TCP_Test_Tool_ESAS_Core

1. Setup Environments folder:
   py -m venv venv

2. Active Python env on windows:
   -> if use cmd:
   .\venv\Scripts\activate.bat
   -> if use windows powershell:
   .\venv\Scripts\activate.ps1

3. Install package:
   pip install -r requirements.txt

4. 『main.py』内の以下設定を環境に合わせてご設定ください。
host = '[ESASをインストールしているサーバのIP]'
fileName = '[音声ファイルのパス]'

5. venv環境にて『main.py』を実行することで音声の解析が行われます。

6. 複数同時に解析を行う場合はvenv環境にて『exec_main.bat』 を実行してください。
   batファイル内にloop_maxの設定があるため、こちらの値を設定することで任意の数多重起動できます。
   1つだけ実行する場合はloop_max=1となります。
