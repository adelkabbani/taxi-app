
try {
    $body = @{
        passengerName = "API Test VIP"
        passengerPhone = "+123456789"
        pickupAddress = "Test Address"
        pickupLat = 52.52
        pickupLng = 13.40
        scheduledPickupTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        flightNumber = "API999"
        serviceType = "executive"
        
        # 'vehicleType' is often inside a 'requirements' object or root depending on implementation
        # Based on bookingService.js: "requirements.vehicleType"
        requirements = @{
            vehicleType = "luxury"
        }
    } | ConvertTo-Json -Depth 5

    Write-Host "Sending POST Request to create booking..."
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/bookings" -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "Booking Created. ID: $($response.id)"
    
    Write-Host "Verifying new fields..."
    if ($response.flight_number -eq "API999") { Write-Host "PASS: flight_number is API999" } else { Write-Host "FAIL: flight_number is $($response.flight_number)" }
    if ($response.service_type -eq "executive") { Write-Host "PASS: service_type is executive" } else { Write-Host "FAIL: service_type is $($response.service_type)" }
    
    # Check if retrieval via search works
    Write-Host "Searching for booking..."
    $search = Invoke-RestMethod -Uri "http://localhost:3002/api/bookings?search=API999" -Method Get
    
    if ($search.bookings.length -gt 0) {
        Write-Host "PASS: Search found the booking"
        $found = $search.bookings[0]
         if ($found.flight_number -eq "API999") { Write-Host "PASS: Retrieved flight_number matches" }
    } else {
        Write-Host "FAIL: Search did not find the booking"
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
