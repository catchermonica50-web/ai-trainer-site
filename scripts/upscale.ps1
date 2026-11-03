# Stage 2 asset upscale: extract frames -> Real-ESRGAN x4plus -> lanczos 1920x1080 PNG
# Usage: powershell -File scripts/upscale.ps1 -Src <dir with 0.mp4,2.mp4> -Work <temp dir> -Esrgan <exe> [-Tile 0] [-Gpu 1] [-Model realesrgan-x4plus]
# -t 0 = auto tile size; -j 1:2:2 = load:proc:save threads. Sources are only read.
param(
  [Parameter(Mandatory)][string]$Src,
  [Parameter(Mandatory)][string]$Work,
  [string]$Esrgan = $env:REALESRGAN_EXE, # path to realesrgan-ncnn-vulkan.exe (official v0.2.5.0 Windows build)
  [string]$Model = 'realesrgan-x4plus',
  [int]$Tile = 0,
  [int]$Gpu = 1
)
$ErrorActionPreference = 'Stop'
if (-not $Esrgan) { throw 'Pass -Esrgan or set REALESRGAN_EXE' }
foreach ($n in '2', '0') {
  $raw = Join-Path $Work "$n\raw"; $x4 = Join-Path $Work "$n\x4"; $hd = Join-Path $Work "$n\1080"
  New-Item -ItemType Directory -Force $raw, $x4, $hd | Out-Null
  $sw = [Diagnostics.Stopwatch]::StartNew()
  ffmpeg -v error -y -i (Join-Path $Src "$n.mp4") -fps_mode passthrough (Join-Path $raw 'f%04d.png')
  if ($LASTEXITCODE -ne 0) { throw 'ffmpeg failed' }
  & $Esrgan -i $raw -o $x4 -n $Model -s 4 -t $Tile -f png -g $Gpu -j 1:2:2
  if ($LASTEXITCODE -ne 0) { throw "esrgan failed $LASTEXITCODE" }
  ffmpeg -v error -y -framerate 24 -i (Join-Path $x4 'f%04d.png') -vf 'scale=1920:1080:flags=lanczos' -start_number 1 (Join-Path $hd 'f%04d.png')
  if ($LASTEXITCODE -ne 0) { throw 'ffmpeg failed' }
  $sw.Stop()
  $cnt = (Get-ChildItem $hd -Filter *.png).Count
  $mb = [math]::Round(((Get-ChildItem $hd -Filter *.png | Measure-Object Length -Sum).Sum / 1MB), 1)
  Write-Output ("video {0}: frames={1} seconds={2:N1} png1080MB={3}" -f $n, $cnt, $sw.Elapsed.TotalSeconds, $mb)
}
