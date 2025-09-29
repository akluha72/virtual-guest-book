<?php
$host = "ftp://153.92.8.28";
$user = "u562588233_raikancinta72";
$pass = "luTfi@kmal72";  
$db = "u562588233_vgb_firdaus";

$conn = new mysql($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("DB connection failed: " . $conn->connect_error);
}
?>