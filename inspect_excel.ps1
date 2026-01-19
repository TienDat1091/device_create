$path = "c:\Users\MyRogStrixPC\Desktop\TaoAll\Ho tro tao all - Copy - Copy.xlsx"
try {
    # Set console encoding to UTF8 to handle special chars better in output
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($path)

    Write-Output "--- Sheet List ---"
    $i = 1
    $targetSheet = $null
    foreach ($s in $workbook.Sheets) {
        Write-Output "[$i] $($s.Name)"
        if ($s.Name -match "Route") {
            $targetSheet = $s
        }
        $i++
    }

    if ($targetSheet) {
        Write-Output "`n--- Content of Sheet '$($targetSheet.Name)' ---"
        $usedRange = $targetSheet.UsedRange
        $maxRow = 20
        $maxCol = 10 

        for ($r = 1; $r -le $maxRow; $r++) {
            $rowVals = @()
            for ($c = 1; $c -le $maxCol; $c++) {
                $txt = $targetSheet.Cells.Item($r, $c).Text
                if (-not [string]::IsNullOrWhiteSpace($txt)) {
                     $rowVals += $txt # Just collect non-empty to check structure
                } else {
                     $rowVals += ""
                }
            }
            # Print if row has content
            if ($rowVals -join "" -ne "") {
                Write-Output ($rowVals -join " | ")
            }
        }

    } else {
        Write-Output "No sheet with 'Route' in name found."
    }

    $workbook.Close($false)
    $excel.Quit()
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($excel) {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
}
