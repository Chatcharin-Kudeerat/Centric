$ESAS_SW_ADDRESS="192.168.189.1"
$ESAS_NETWORK="192.168.189.0/24"
$ESAS_CORE_ADDRESS="192.168.189.2"
$ESAS_RTP_PORT_MIN=35000
$ESAS_RTP_PORT_MAX=44999

$esasSwCount = (Get-VMSwitch | Where-Object {$_.Name -Match "ESAS_INTERNAL_SW"} | Measure-Object).Count
if ($esasSwCount -eq 0){
  Write-Host "Create new NatVMSwitch ESAS_INTERNAL_SW"
  New-VMSwitch -SwitchName ESAS_INTERNAL_SW -SwitchType Internal -ErrorAction Stop
}

$ips = Get-NetIPAddress | Where-Object {$_.InterfaceAlias -Match "ESAS_INTERNAL_SW"}
for ($i = 0; $i -lt ($ips | Measure-Object).Count; $i++) {
  $ip = $ips[$i]
  Write-Host "Remove old IP address $($ip.InterfaceAlias) $($ip.IPAddress)"
  $result = Remove-NetIPAddress -IPAddress $($ip.IPAddress) -Confirm:$false -ErrorAction Stop
} 
Write-Host "Bind IP address $ESAS_SW_ADDRESS to NatAdapter ESAS_INTERNAL_SW"

$esasAdapter = (Get-NetAdapter | Where-Object {$_.Name -Match "ESAS_INTERNAL_SW"} | Where-Object {$_.Status -Match "Up"})[0]
$result = New-NetIPAddress -IPAddress $ESAS_SW_ADDRESS -PrefixLength 24 -InterfaceIndex $esasAdapter.ifIndex -ErrorAction Stop
if ((Get-NetNat | Where-Object {$_.Name -Match "ESAS_NETNAT"} | Measure-Object).Count -gt 0) {
  Write-Host "Remove old NetNat"
  $result = Remove-NetNat -Name ESAS_NETNAT -Confirm:$false -ErrorAction Stop
}
Write-Host "Create new NatNat ESAS_NETNAT"
$result = New-NetNat -Name ESAS_NETNAT -InternalIPInterfaceAddressPrefix $ESAS_NETWORK -ErrorAction Stop
if ((Get-NetNatStaticMapping | Where-Object {$_.NatName -Match "ESAS_NETNAT"} | Measure-Object).Count -gt 0) {
  Write-Host "Remove old NetNatStaticMapping"
  $result = Remove-NetNatStaticMapping ESAS_NETNAT -Confirm:$false -ErrorAction Stop
}
Write-Host "Create NetNatStaticMapping TCP:80"
$result = Add-NetNatStaticMapping ESAS_NETNAT -ExternalIPAddress 0.0.0.0 -InternalIPAddress $ESAS_CORE_ADDRESS -Protocol TCP -ExternalPort 80 -InternalPort 80 -ErrorAction Stop
Write-Host "Create NetNatStaticMapping TCP:8001"
$result = Add-NetNatStaticMapping ESAS_NETNAT -ExternalIPAddress 0.0.0.0 -InternalIPAddress $ESAS_CORE_ADDRESS -Protocol TCP -ExternalPort 8001 -InternalPort 8001 -ErrorAction Stop
Write-Host "Create NetNatStaticMapping TCP:443"
$result = Add-NetNatStaticMapping ESAS_NETNAT -ExternalIPAddress 0.0.0.0 -InternalIPAddress $ESAS_CORE_ADDRESS -Protocol TCP -ExternalPort 443 -InternalPort 443 -ErrorAction Stop
Write-Host "Create NetNatStaticMapping UDP:$ESAS_RTP_PORT_MIN - $ESAS_RTP_PORT_MAX"
for($port=$ESAS_RTP_PORT_MIN; $port -le $ESAS_RTP_PORT_MAX; $port++) {
  if ($port % 1000 -eq 0) {
    Write-Host " - $port"
  }
  try {
    $result = Add-NetNatStaticMapping ESAS_NETNAT -ExternalIPAddress 0.0.0.0 -InternalIPAddress $ESAS_CORE_ADDRESS -Protocol UDP -ExternalPort $port -InternalPort $port -ErrorAction Stop
  } catch {
    Write-Host "CATCH $port " + $_.Exception.Message
    throw $_.Exception
    exit 1
  }
}
