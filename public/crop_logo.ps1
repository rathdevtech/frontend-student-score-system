Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("$PSScriptRoot\pn_logo.png")
$h = $src.Height
Write-Host "Original: $($src.Width) x $h"
$bmp = New-Object System.Drawing.Bitmap($h, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $h, $h)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $h, $h)
$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$src.Dispose()
$bmp.Save("$PSScriptRoot\pn_favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Done - saved pn_favicon.png"
