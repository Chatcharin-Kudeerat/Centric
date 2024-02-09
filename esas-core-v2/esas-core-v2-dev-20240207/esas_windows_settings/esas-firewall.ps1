if ((Get-NetFirewallRule -DisplayName "ESAS-core(TCP)" | Measure-Object).Count -eq 0) {
  New-NetFirewallRule -DisplayName 'ESAS-core(TCP)' -Protocol TCP -LocalPort 80,8001,443 -ErrorAction Stop
}
if ((Get-NetFirewallRule -DisplayName "ESAS-core(UDP)" | Measure-Object).Count -eq 0) {
  New-NetFirewallRule -DisplayName 'ESAS-core(UDP)' -Protocol UDP -LocalPort 35000-45000 -ErrorAction Stop
}