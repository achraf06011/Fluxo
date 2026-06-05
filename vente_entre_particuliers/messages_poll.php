<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/config/auth.php";
requireLogin();

$userId    = currentUserId();
$annonceId = (int)($_GET["annonce"] ?? 0);
$toId      = (int)($_GET["to"] ?? 0);
$after     = (int)($_GET["after"] ?? 0);

if ($annonceId <= 0 || $toId <= 0) {
  echo json_encode(["ok" => false, "messages" => []], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  // Marquer comme lus les messages reçus de l'autre dans cette conversation
  try {
    $cols = $pdo->query("SHOW COLUMNS FROM message")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (in_array("is_lu", $cols, true)) {
      $u = $pdo->prepare("
        UPDATE message
        SET is_lu = 1, date_lu = NOW()
        WHERE id_annonce = ?
          AND id_expediteur = ?
          AND id_destinataire = ?
          AND is_lu = 0
      ");
      $u->execute([$annonceId, $toId, $userId]);
    }
  } catch (Exception $e) {
    // colonnes is_lu/date_lu absentes : on ignore
  }

  $stmt = $pdo->prepare("
    SELECT id_message, id_expediteur, contenu, date_envoi
    FROM message
    WHERE id_annonce = ?
      AND id_message > ?
      AND (
        (id_expediteur = ? AND id_destinataire = ?)
        OR
        (id_expediteur = ? AND id_destinataire = ?)
      )
    ORDER BY id_message ASC
    LIMIT 200
  ");
  $stmt->execute([$annonceId, $after, $userId, $toId, $toId, $userId]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $messages = [];
  foreach ($rows as $m) {
    $messages[] = [
      "id_message" => (int)$m["id_message"],
      "mine"       => ((int)$m["id_expediteur"] === $userId),
      "contenu"    => (string)$m["contenu"],
      "date_envoi" => (string)$m["date_envoi"],
    ];
  }

  echo json_encode(["ok" => true, "messages" => $messages], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["ok" => false, "messages" => []], JSON_UNESCAPED_UNICODE);
}
