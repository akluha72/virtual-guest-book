<?php
require __DIR__ . "/../../../private/db.php";

// Ensure uploads folder exists
$uploadDir = __DIR__ . "/uploads/";
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$name = $_POST['guest_name'] ?? '';
$event_date = $_POST['event_date'] ?? date("Y-m-d");
$photoPath = '';
$audioPath = '';

// Save photo
if (!empty($_FILES['photo']['name'])) {
    $photoPath = "uploads/" . time() . "_photo_" . basename($_FILES['photo']['name']);
    move_uploaded_file($_FILES['photo']['tmp_name'], __DIR__ . "/" . $photoPath);
}

// Save audio
if (!empty($_FILES['audio']['name'])) {
    $audioPath = "uploads/" . time() . "_audio_" . basename($_FILES['audio']['name']);
    move_uploaded_file($_FILES['audio']['tmp_name'], __DIR__ . "/" . $audioPath);
}

$sql = "INSERT INTO guestbook_entries (guest_name, event_date, photo, audio) 
        VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $name, $event_date, $photoPath, $audioPath);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}

$stmt->close();
$conn->close();