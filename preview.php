<?php
// Preview page showing entries in a single-column, "stories" style
// Uses same DB include style as save_entry.php
require __DIR__ . "/../../../private/db.php";

$entries = [];
$sql = "SELECT id, guest_name, event_date, photo, audio, created_at FROM guestbook_entries ORDER BY id DESC";
if ($result = $conn->query($sql)) {
    while ($row = $result->fetch_assoc()) {
        $entries[] = $row;
    }
    $result->free();
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guestbook Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sacramento&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Fleur+De+Leah&display=swap" rel="stylesheet">
  <script type="module" src="/src/scripts/preview.js"></script>
</head>
<body>
  <div id="previewContainer">
    <?php if (empty($entries)): ?>
      <div class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">📝</div>
          <h1>No entries yet</h1>
          <p>Be the first to leave a message!</p>
        </div>
      </div>
    <?php else: ?>
      <div class="swipe-container" id="swipeContainer">
        <div class="cards-wrapper" id="cardsWrapper">
          <?php foreach ($entries as $index => $e):
            $name = htmlspecialchars($e['guest_name'] ?? '');
            $date = htmlspecialchars($e['event_date'] ?? '');
            $photo = htmlspecialchars($e['photo'] ?? '');
            $audio = htmlspecialchars($e['audio'] ?? '');
          ?>
          <div class="guest-card" data-index="<?php echo $index; ?>">
            <div class="card-content">
              <div class="photo-container">
                <img class="guest-photo" src="<?php echo $photo ? $photo : '/vite.svg'; ?>" alt="<?php echo $name ?: 'Guest'; ?>" />
              </div>
              <div class="guest-info">
                <h2 class="guest-name"><?php echo $name ?: 'Guest'; ?></h2>
                <p class="guest-date"><?php echo $date; ?></p>
              </div>
              <?php if ($audio): ?>
              <div class="audio-section">
                <canvas class="audio-visualizer" width="400" height="120"></canvas>
                <audio class="audio-player" preload="metadata" src="<?php echo $audio; ?>"></audio>
                <button class="play-button">▶️ Play</button>
              </div>
              <?php endif; ?>
            </div>
          </div>
          <?php endforeach; ?>
        </div>
        
        <!-- Navigation dots -->
        <div class="nav-dots">
          <?php for ($i = 0; $i < count($entries); $i++): ?>
            <span class="dot <?php echo $i === 0 ? 'active' : ''; ?>" data-index="<?php echo $i; ?>"></span>
          <?php endfor; ?>
        </div>
        
        <!-- Navigation arrows -->
        <button class="nav-arrow nav-prev" id="prevBtn">‹</button>
        <button class="nav-arrow nav-next" id="nextBtn">›</button>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>

