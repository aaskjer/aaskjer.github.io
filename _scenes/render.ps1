<#
  Renders the scene mockups in this folder to the pictures the site uses:
  assets/img/scenes/<name>.jpg (1600x900) and <name>-thumb.jpg (960x540).

  Needs Google Chrome or Microsoft Edge, and Python for a local web server
  (the overlays load their sample game state over HTTP).

    powershell -ExecutionPolicy Bypass -File _scenes\render.ps1
    powershell -ExecutionPolicy Bypass -File _scenes\render.ps1 -Scene hangman-game
#>
param(
  # Hangman comes first: Better Stream Announcements shows its picture as the stream preview.
  [string[]] $Scene = @('hangman-game', 'battleship-game', 'blackjack-game', 'trivia-game',
                        'classic-chat-gamble', 'slot-machine-game', 'better-stream-announcements', 'sbreffix'),
  [int] $Port = 8765
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root 'assets\img\scenes'
$work = Join-Path $env:TEMP 'aaskjer-scenes'
New-Item -ItemType Directory -Force $target, $work | Out-Null

$browser = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is needed to render the scenes.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python is needed for the local web server.' }

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg([System.Drawing.Image] $image, [int] $width, [int] $height, [string] $path, [long] $quality) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = 'HighQualityBicubic'
  $graphics.PixelOffsetMode = 'HighQuality'
  $graphics.CompositingQuality = 'HighQuality'
  $graphics.DrawImage($image, 0, 0, $width, $height)
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $quality
  $bitmap.Save($path, $jpeg, $params)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$server = Start-Process python -ArgumentList '-m', 'http.server', $Port, '--bind', '127.0.0.1', '--directory', "`"$root`"" `
  -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 1
  foreach ($name in $Scene) {
    $png = Join-Path $work "$name.png"
    Remove-Item $png -ErrorAction SilentlyContinue
    # Chrome's own log goes to a file: it is noisy, and its error lines are not failures.
    $arguments = '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
                 "`"--user-data-dir=$work\profile`"", '--window-size=1600,900', '--virtual-time-budget=6000',
                 "`"--screenshot=$png`"", "http://127.0.0.1:$Port/_scenes/$name.html"
    Start-Process $browser -ArgumentList $arguments -Wait -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $work 'browser.out') -RedirectStandardError (Join-Path $work 'browser.log')
    if (-not (Test-Path $png)) {
      Write-Warning "$name was not rendered, see $work\browser.log"
      continue
    }
    $image = [System.Drawing.Image]::FromFile($png)
    Save-Jpeg $image 1600 900 (Join-Path $target "$name.jpg") 84
    Save-Jpeg $image 960 540 (Join-Path $target "$name-thumb.jpg") 80
    $image.Dispose()
    Write-Host "ok   $name"
  }
}
finally {
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
