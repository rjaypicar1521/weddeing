$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Ensure-Directory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function New-BrushFromHex {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Hex
  )

  $clean = $Hex.TrimStart('#')
  $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)
  return New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($r, $g, $b))
}

function New-MockImage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [int]$Width,
    [Parameter(Mandatory = $true)]
    [int]$Height,
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [Parameter(Mandatory = $true)]
    [string]$Subtitle,
    [Parameter(Mandatory = $true)]
    [string]$AccentHex,
    [Parameter(Mandatory = $true)]
    [string]$BaseHex
  )

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
  $baseColor = (New-BrushFromHex -Hex $BaseHex).Color
  $accentColor = (New-BrushFromHex -Hex $AccentHex).Color
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $baseColor, $accentColor, 35
  $graphics.FillRectangle($gradient, $rect)

  $overlayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 255, 255, 255))
  $graphics.FillEllipse($overlayBrush, [int]($Width * 0.05), [int]($Height * 0.08), [int]($Width * 0.36), [int]($Height * 0.34))
  $graphics.FillEllipse($overlayBrush, [int]($Width * 0.55), [int]($Height * 0.48), [int]($Width * 0.28), [int]($Height * 0.24))

  $linePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 255, 255, 255), [float]([Math]::Max(4, $Width * 0.006)))
  $graphics.DrawArc($linePen, [int]($Width * 0.08), [int]($Height * 0.2), [int]($Width * 0.78), [int]($Height * 0.55), 12, 156)
  $graphics.DrawArc($linePen, [int]($Width * 0.15), [int]($Height * 0.12), [int]($Width * 0.7), [int]($Height * 0.72), 200, 110)

  $titleFontSize = [float]([Math]::Round([Math]::Max(28, $Width * 0.04), 0))
  $subtitleFontSize = [float]([Math]::Round([Math]::Max(14, $Width * 0.018), 0))
  $smallFontSize = [float]([Math]::Round([Math]::Max(12, $Width * 0.012), 0))
  $titleFont = New-Object System.Drawing.Font("Georgia", $titleFontSize, [System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object System.Drawing.Font("Segoe UI", $subtitleFontSize, [System.Drawing.FontStyle]::Regular)
  $smallFont = New-Object System.Drawing.Font("Segoe UI", $smallFontSize, [System.Drawing.FontStyle]::Regular)

  $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
  $softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(215, 255, 244, 248))

  $titleRect = New-Object System.Drawing.RectangleF ([float]($Width * 0.08)), ([float]($Height * 0.62)), ([float]($Width * 0.84)), ([float]($Height * 0.18))
  $subtitleRect = New-Object System.Drawing.RectangleF ([float]($Width * 0.08)), ([float]($Height * 0.79)), ([float]($Width * 0.84)), ([float]($Height * 0.1))
  $tagRect = New-Object System.Drawing.RectangleF ([float]($Width * 0.08)), ([float]($Height * 0.08)), ([float]($Width * 0.38)), ([float]($Height * 0.06))

  $graphics.DrawString($Title, $titleFont, $whiteBrush, $titleRect)
  $graphics.DrawString($Subtitle, $subtitleFont, $softBrush, $subtitleRect)
  $graphics.DrawString("WEDDING ONLINE MOCK ASSET", $smallFont, $softBrush, $tagRect)

  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($extension) {
    ".png" { $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png) }
    default { $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Jpeg) }
  }

  $titleFont.Dispose()
  $subtitleFont.Dispose()
  $smallFont.Dispose()
  $whiteBrush.Dispose()
  $softBrush.Dispose()
  $overlayBrush.Dispose()
  $linePen.Dispose()
  $gradient.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$outputRoot = Join-Path $PSScriptRoot "..\\output\\imagegen\\builder-mock"
$resolvedRoot = [System.IO.Path]::GetFullPath($outputRoot)
Ensure-Directory -Path $resolvedRoot

New-MockImage -Path (Join-Path $resolvedRoot "hero-burgundy.jpg") -Width 1600 -Height 900 -Title "Alex & Jamie" -Subtitle "Hero photo for invitation landing screen" -AccentHex "#7A1F35" -BaseHex "#E9C7D0"
New-MockImage -Path (Join-Path $resolvedRoot "gallery-01.jpg") -Width 1400 -Height 1000 -Title "Sunset Session" -Subtitle "Gallery image 1" -AccentHex "#6F1D2B" -BaseHex "#F0D9DF"
New-MockImage -Path (Join-Path $resolvedRoot "gallery-02.jpg") -Width 1400 -Height 1000 -Title "Cathedral Walk" -Subtitle "Gallery image 2" -AccentHex "#8F3148" -BaseHex "#F7E6EA"
New-MockImage -Path (Join-Path $resolvedRoot "gallery-03.jpg") -Width 1400 -Height 1000 -Title "After The Yes" -Subtitle "Gallery image 3" -AccentHex "#5C1425" -BaseHex "#EED6DD"
New-MockImage -Path (Join-Path $resolvedRoot "chapter-01.jpg") -Width 1200 -Height 1500 -Title "How We Met" -Subtitle "Love story chapter photo 1" -AccentHex "#7A1F35" -BaseHex "#F4E3E8"
New-MockImage -Path (Join-Path $resolvedRoot "chapter-02.jpg") -Width 1200 -Height 1500 -Title "The Proposal" -Subtitle "Love story chapter photo 2" -AccentHex "#5C1425" -BaseHex "#ECD5DC"
New-MockImage -Path (Join-Path $resolvedRoot "entourage-01.jpg") -Width 900 -Height 1200 -Title "Maid of Honor" -Subtitle "Entourage portrait" -AccentHex "#7A1F35" -BaseHex "#F3DFE5"
New-MockImage -Path (Join-Path $resolvedRoot "entourage-02.jpg") -Width 900 -Height 1200 -Title "Best Man" -Subtitle "Entourage portrait" -AccentHex "#6F1D2B" -BaseHex "#EED6DD"
New-MockImage -Path (Join-Path $resolvedRoot "entourage-03.jpg") -Width 900 -Height 1200 -Title "Ninang" -Subtitle "Entourage portrait" -AccentHex "#8F3148" -BaseHex "#F7E8EC"
New-MockImage -Path (Join-Path $resolvedRoot "entourage-04.jpg") -Width 900 -Height 1200 -Title "Ninong" -Subtitle "Entourage portrait" -AccentHex "#5C1425" -BaseHex "#EDD2DA"
New-MockImage -Path (Join-Path $resolvedRoot "gift-qr.png") -Width 1000 -Height 1000 -Title "GCash Gift" -Subtitle "Mock QR code placeholder" -AccentHex "#7A1F35" -BaseHex "#F8EEF1"

Write-Output $resolvedRoot
