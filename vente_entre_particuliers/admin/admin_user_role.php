<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/auth.php";
requireAdmin();

if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  header("Location: ../admin/users.php");
  exit;
}

$id = (int)($_POST["id_user"] ?? 0);
$role = $_POST["role"] ?? "USER";
if (!in_array($role, ["USER","ADMIN"], true) || $id <= 0) {
  $_SESSION["flash_error"] = "Données invalides.";
  header("Location: ../admin/users.php");
  exit;
}

$pdo->prepare("UPDATE user SET role=? WHERE id_user=?")->execute([$role, $id]);
$_SESSION["flash_success"] = "Rôle de l'utilisateur #$id mis à jour : $role";
header("Location: ../admin/users.php");
exit;