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
  <script type="module" src="/src/preview.js"></script>
</head>
<body>
  <div id="storiesRoot" style="max-width:720px; margin: 0 auto; padding: 1rem;">
    <h1 style="font-family: 'Sacramento', cursive; text-align:center;">Guestbook Stories</h1>
    <?php if (empty($entries)): ?>
      <p style="text-align:center; opacity:0.7;">No entries yet.</p>
    <?php else: ?>
      <div class="stories-column">
        <?php foreach ($entries as $e):
          $name = htmlspecialchars($e['guest_name'] ?? '');
          $date = htmlspecialchars($e['event_date'] ?? '');
          $photo = htmlspecialchars($e['photo'] ?? '');
          $audio = htmlspecialchars($e['audio'] ?? '');
        ?>
        <article class="story-card">
          <header class="story-header">
            <img class="story-avatar" src="<?php echo $photo ? $photo : '/vite.svg'; ?>" alt="avatar" />
            <div class="story-meta">
              <div class="story-name"><?php echo $name ?: 'Guest'; ?></div>
              <div class="story-date"><?php echo $date; ?></div>
            </div>
          </header>
          <?php if ($audio): ?>
          <div class="story-audio">
            <audio controls preload="metadata" src="<?php echo $audio; ?>"></audio>
            <canvas class="story-wave" height="84"></canvas>
          </div>
          <?php endif; ?>
        </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>

