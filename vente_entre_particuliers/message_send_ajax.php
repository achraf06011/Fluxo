<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/config/auth.php";
requireLogin();

$userId    = currentUserId();
$idAnnonce = (int)($_POST["id_annonce"] ?? 0);
$toId      = (int)($_POST["to"] ?? 0);
$contenu   = trim($_POST["contenu"] ?? "");

function out(bool $ok, string $msg, array $extra = []): void {
  echo json_encode(array_merge(["ok" => $ok, "message" => $msg], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}

if ($idAnnonce <= 0 || $toId <= 0) out(false, "Paramètres invalides.");
if ($contenu === "")             out(false, "Message vide.");
if (mb_strlen($contenu) > 2000)  out(false, "Message trop long (max 2000 caractères).");
if ($toId === $userId)           out(false, "Tu ne peux pas t’envoyer un message à toi-même.");

try {
  $stmt = $pdo->prepare("SELECT id_annonce, titre, mode_vente FROM annonce WHERE id_annonce = ? LIMIT 1");
  $stmt->execute([$idAnnonce]);
  $annonce = $stmt->fetch();
  if (!$annonce) out(false, "Annonce introuvable.");

  $mode = (string)($annonce["mode_vente"] ?? "");
  if (!in_array($mode, ["POSSIBILITE_CONTACTE", "LES_DEUX"], true)) {
    out(false, "Cette annonce n’autorise pas la discussion.");
  }

  $stmt = $pdo->prepare("
    INSERT INTO message (contenu, date_envoi, id_expediteur, id_destinataire, id_annonce, is_lu)
    VALUES (?, NOW(), ?, ?, ?, 0)
  ");
  $stmt->execute([$contenu, $userId, $toId, $idAnnonce]);
  $newId = (int)$pdo->lastInsertId();

  // Notification pour le destinataire (même logique que message_action.php)
  $contenuNotif = "Tu as reçu un nouveau message à propos de : " . ($annonce["titre"] ?? ("Annonce #" . $idAnnonce));
  $stmtN = $pdo->prepare("
    INSERT INTO notification (id_user, type_notification, titre, contenu, lien, is_read, created_at, is_popup_seen)
    VALUES (?, ?, ?, ?, ?, 0, NOW(), 0)
  ");
  $stmtN->execute([
    $toId,
    "NEW_MESSAGE",
    "Nouveau message",
    $contenuNotif,
    "messages.php?annonce=" . $idAnnonce . "&to=" . $userId,
  ]);

  $stmt = $pdo->prepare("SELECT date_envoi FROM message WHERE id_message = ?");
  $stmt->execute([$newId]);
  $date = (string)$stmt->fetchColumn();

  out(true, "Message envoyé.", [
    "new_message" => [
      "id_message" => $newId,
      "mine"       => true,
      "contenu"    => $contenu,
      "date_envoi" => $date,
    ],
  ]);

} catch (Exception $e) {
  out(false, "Erreur serveur.");
}
