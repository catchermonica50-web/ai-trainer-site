# Stage 2 QA: before/after comparisons + temporal flicker metric for the upscale.
# Usage: powershell -File scripts/compare.ps1 -Work <temp dir> [-Out reports/stage-2/upscale]
param(
  [Parameter(Mandatory)][string]$Work,
  [string]$Out = ''
)
$ErrorActionPreference = 'Stop'
if (-not $Out) { $Out = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\reports\stage-2\upscale' }
New-Item -ItemType Directory -Force $Out | Out-Null
function Run([string[]]$a) { & ffmpeg -v error -y @a; if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed: $a" } }
$label = "drawtext=fontfile='C\:/Windows/Fonts/consola.ttf':fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:x=12:y=12:text="
$summary = @()
foreach ($v in @(@('2', 121), @('0', 122))) {
  $n = $v[0]; $count = $v[1]
  foreach ($f in @(1, [int][math]::Ceiling($count / 2), $count)) {
    $id = '{0:D4}' -f $f
    $raw = Join-Path $Work "$n\raw\f$id.png"; $hd = Join-Path $Work "$n\1080\f$id.png"
    # Full frame side by side (each half 960x540).
    Run @('-i', $raw, '-i', $hd, '-filter_complex',
      "[0]scale=1920:1080:flags=lanczos,scale=960:540,${label}'lanczos 720->1080'[a];[1]scale=960:540,${label}'x4plus->1080'[b];[a][b]hstack",
      '-q:v', '4', (Join-Path $Out "v$n-f$id-side.jpg"))
    # 1:1 crop zoom of the centre (480x270 of the 1080p frame, shown at 2x).
    $crop = 'crop=480:270:720:405,scale=960:540:flags=neighbor'
    Run @('-i', $raw, '-i', $hd, '-filter_complex',
      "[0]scale=1920:1080:flags=lanczos,$crop,${label}'lanczos crop 2x'[a];[1]$crop,${label}'x4plus crop 2x'[b];[a][b]hstack",
      '-q:v', '4', (Join-Path $Out "v$n-f$id-zoom.jpg"))
  }
  # Temporal flicker: mean luma |frame[i] - frame[i-1]| for lanczos baseline vs x4plus.
  $res = @{}
  foreach ($kind in @('raw', '1080')) {
    $txt = Join-Path $env:TEMP "flicker-$n-$kind.txt"
    $vf = if ($kind -eq 'raw') { 'scale=1920:1080:flags=lanczos,' } else { '' }
    $meta = "metadata=print:key=lavfi.signalstats.YAVG:file='" + ($txt -replace '\\', '/' -replace ':', '\:') + "'"
    Run @('-framerate', '24', '-i', (Join-Path $Work "$n\$kind\f%04d.png"), '-vf', "${vf}format=yuv420p,tblend=all_mode=difference,signalstats,$meta", '-f', 'null', '-')
    $vals = Select-String -Path $txt -Pattern 'YAVG=([\d.]+)' | ForEach-Object { [double]$_.Matches[0].Groups[1].Value }
    $res[$kind] = [math]::Round(($vals | Measure-Object -Average).Average, 3)
  }
  $summary += [pscustomobject]@{ video = "$n.mp4"; meanDiffLanczos = $res['raw']; meanDiffX4plus = $res['1080']; ratio = [math]::Round($res['1080'] / $res['raw'], 3) }
}
$summary | Format-Table -AutoSize | Out-String | Tee-Object (Join-Path $Out 'flicker.txt')
