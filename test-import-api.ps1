$body = @{
    databaseType = "MYSQL"
    host = "localhost"
    port = 3306
    databaseName = "works"
    username = "root"
    password = "root"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri http://localhost:3001/api/reverse-engineering/tables -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host ""
    Write-Host "Response Content:"
    $response.Content | Out-File -FilePath "d:\trea_projects\DataRelationshipDesign\api-response.json"
    Write-Host "Response saved to api-response.json"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Content: $errorContent"
    }
}