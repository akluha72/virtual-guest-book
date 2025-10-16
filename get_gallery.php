<?php
require __DIR__ . "/../../../private/db.php";

header('Content-Type: application/json');

try {
    $sql = "SELECT guest_name, event_date, photo, created_at FROM guestbook_entries 
            WHERE photo != '' AND photo IS NOT NULL 
            ORDER BY created_at DESC LIMIT 50";
    
    $result = $conn->query($sql);
    $entries = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $entries[] = [
                'guest_name' => $row['guest_name'],
                'event_date' => $row['event_date'],
                'photo' => $row['photo'],
                'created_at' => $row['created_at']
            ];
        }
        $result->free();
    }
    
    echo json_encode([
        'status' => 'success',
        'entries' => $entries,
        'count' => count($entries)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
