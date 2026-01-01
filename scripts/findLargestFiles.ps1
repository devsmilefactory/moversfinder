$proj = (Resolve-Path ".").Path
$files = Get-ChildItem -Recurse -File -Include *.js,*.jsx src | Where-Object { $_.FullName -notmatch "\\(utils\\testing|__tests__|mocks)\\" }

$rows = foreach ($f in $files) {
  $lines = (Get-Content -LiteralPath $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
  [pscustomobject]@{
    Lines = $lines
    File  = $f.FullName.Substring($proj.Length + 1)
  }
}

$rows | Sort-Object Lines -Descending | Select-Object -First 25 | Format-Table -AutoSize


