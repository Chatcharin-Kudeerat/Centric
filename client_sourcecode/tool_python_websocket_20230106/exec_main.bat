@echo off

rem utf-8
chcp 65001

rem -----------------------------------------------------------------------------
rem ※このファイル実行時はmain.py内のhostとfileNameを設定してください。
rem 同hostに対して、同ファイルを送信し、パフォーマンスの検証を行います。
rem 
rem host = '192.168.1.120'
rem fileName = 'C:/websocket-python/Sample1.wav'
rem -----------------------------------------------------------------------------

rem 並列実行数を指定
set loop_max=1

rem ループ処理にてmain.pyを呼び出し
for /l %%i in (1,1,%loop_max%) do (
    powershell -Command "sleep -m 10"
    start /b py main.py %%i
)
