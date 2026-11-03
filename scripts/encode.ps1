# Stage 2 asset encode: 1080p PNG frames (from upscale.ps1) -> versioned web assets.
# Usage: powershell -File scripts/encode.ps1 -Work <temp dir> [-Out public/media/intro] [-Ver v1]
param(
  [Parameter(Mandatory)][string]$Work,
  [string]$Out = '',
  [string]$Ver = 'v1'
)
$ErrorActionPreference = 'Stop'
if (-not $Out) { $Out = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\public\media\intro' }
New-Item -ItemType Directory -Force $Out | Out-Null
$idle = Join-Path $Work '2\1080\f%04d.png'
$tf = Join-Path $Work '0\1080\f%04d.png'
$KB = 1024; $MB = 1024 * 1024

function Run([string[]]$a) {
  & ffmpeg -v error -y @a
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed: $a" }
}
function Size($p) { (Get-Item $p).Length }
function Enc($kind, $in, $vf, $frames, $p, $q) {
  switch ($kind) {
    'vp9' { Run @('-framerate', '24', '-i', $in, '-frames:v', $frames, '-vf', $vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', $q, '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', $p) }
    'x264' { Run @('-framerate', '24', '-i', $in, '-frames:v', $frames, '-vf', $vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', $q, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', $p) }
    'avif' { Run @('-i', $in, '-frames:v', '1', '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', $q, '-cpu-used', '4', '-pix_fmt', 'yuv420p', $p) }
    'webp' { Run @('-i', $in, '-frames:v', '1', '-c:v', 'libwebp', '-quality', $q, '-compression_level', '6', $p) }
  }
}
# Encode with decreasing quality until the file fits under $limit.
function Fit($name, $limit, $qs, $kind, $in, $vf, $frames) {
  $p = Join-Path $Out $name
  foreach ($q in $qs) {
    Enc $kind $in $vf $frames $p $q
    if ((Size $p) -le $limit) { Write-Output ("{0} q={1} {2:N0}KB" -f $name, $q, ((Size $p) / $KB)); return }
  }
  throw "$name over limit"
}
$hd = 'scale=1920:1080'; $sd = 'scale=1280:720:flags=lanczos'

# Idle loop: keep all 121 frames. Measured PSNR f121->f1 = 31.9 dB, inside the 27-36 dB range of normal
# adjacent frames, so the wrap is not a visible jump and no frame is duplicated.
Fit "intro-idle.$Ver.webm" (2.5 * $MB) @(32, 35, 38, 41, 44) 'vp9' $idle $hd 121
Fit "intro-idle.$Ver.mp4" (2.5 * $MB) @(23, 25, 27, 29, 31) 'x264' $idle $hd 121
Fit "intro-transform.$Ver.webm" (6 * $MB) @(30, 33, 36, 39) 'vp9' $tf $hd 122
Fit "intro-transform.$Ver.mp4" (6 * $MB) @(22, 24, 26, 28) 'x264' $tf $hd 122
Fit "intro-transform-720.$Ver.webm" (3 * $MB) @(32, 35, 38, 41) 'vp9' $tf $sd 122
Fit "intro-transform-720.$Ver.mp4" (3 * $MB) @(23, 25, 27, 29) 'x264' $tf $sd 122

# Posters: first frame of 2, last frame of 0.
$first2 = Join-Path $Work '2\1080\f0001.png'; $last0 = Join-Path $Work '0\1080\f0122.png'
foreach ($pair in @(@('intro-poster', $first2), @('intro-still', $last0))) {
  Fit "$($pair[0]).$Ver.avif" (150 * $KB) @(28, 32, 36, 40) 'avif' $pair[1] '' 1
  Fit "$($pair[0]).$Ver.webp" (150 * $KB) @(82, 75, 68, 60) 'webp' $pair[1] '' 1
}

# Scrub sequences: f000..f121.webp. 1080p: each <=70KB, total <=8MB.
foreach ($s in @(@('1080', $hd, 70, 8), @('720', $sd, 40, 4))) {
  $dir = Join-Path $Out "seq-$($s[0]).$Ver"
  foreach ($q in @(78, 72, 66, 60, 55, 50)) {
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
    New-Item -ItemType Directory -Force $dir | Out-Null
    Run @('-framerate', '24', '-i', $tf, '-vf', $s[1], '-c:v', 'libwebp', '-quality', $q, '-compression_level', '6', '-start_number', '0', (Join-Path $dir 'f%03d.webp'))
    $files = Get-ChildItem $dir -Filter *.webp
    $max = ($files | Measure-Object Length -Maximum).Maximum; $sum = ($files | Measure-Object Length -Sum).Sum
    if ($max -le $s[2] * $KB -and $sum -le $s[3] * $MB) {
      Write-Output ("seq-{0} q={1} n={2} total={3:N2}MB maxFrame={4:N1}KB" -f $s[0], $q, $files.Count, ($sum / $MB), ($max / $KB)); break
    }
    if ($q -eq 50) { throw "seq-$($s[0]) over limit" }
  }
}
