$host.ui.RawUI.WindowTitle = "Waiting for MySQL"

$maxRetries = 30
$retryInterval = 2

$env:MYSQL_HOST = if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { "icss_db" }
$env:MYSQL_PORT = if ($env:MYSQL_PORT) { $env:MYSQL_PORT } else { "3306" }

Write-Host "Waiting for MySQL to be ready..."

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $connection = New-Object System.Data.SqlClient.SqlConnection
        $connection.ConnectionString = "Server=$env:MYSQL_HOST;Port=$env:MYSQL_PORT;User Id=root;Password=$env:MYSQL_ROOT_PASSWORD;"
        $connection.Open()
        $connection.Close()
        Write-Host "MySQL is ready!"
        exit 0
    }
    catch {
        Write-Host "MySQL is not ready yet. Retrying in $retryInterval seconds... (Attempt $i of $maxRetries)"
        Start-Sleep -Seconds $retryInterval
    }
}

Write-Host "Failed to connect to MySQL after $maxRetries attempts."
exit 1