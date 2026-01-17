Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param($size, $filename)
    
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Create gradient background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(102, 126, 234),
        [System.Drawing.Color]::FromArgb(118, 75, 162),
        45
    )
    $graphics.FillRectangle($brush, $rect)
    
    # Add "P" text
    $font = New-Object System.Drawing.Font("Arial", ($size * 0.6), [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $graphics.DrawString("P", $font, $textBrush, ($size / 2), ($size / 2), $format)
    
    $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $font.Dispose()
}

# Create icons
Create-Icon 16 "icons/icon16.png"
Create-Icon 48 "icons/icon48.png"
Create-Icon 128 "icons/icon128.png"

Write-Host "Icons created successfully!" -ForegroundColor Green
