<?php
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

$userId = (int)($_GET["user_id"] ?? 0);

if ($userId <= 0) {
    echo json_encode([
        "ok" => false,
        "message" => "Utilisateur invalide"
    ]);
    exit;
}

try {

    $stmt = $pdo->prepare("SELECT id_panier FROM panier WHERE id_user = ? LIMIT 1");
    $stmt->execute([$userId]);
    $panier = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$panier) {
        echo json_encode([
            "ok" => true,
            "items" => [],
            "total" => 0
        ]);
        exit;
    }

    $panierId = (int)$panier["id_panier"];

    $stmt = $pdo->prepare("
        SELECT 
            pi.id_panier_item,
            pi.quantity,
            a.id_annonce,
            a.titre,
            a.prix,
            a.stock,
            a.cover_image
        FROM panier_item pi
        JOIN annonce a ON a.id_annonce = pi.id_annonce
        WHERE pi.id_panier = ?
        ORDER BY pi.id_panier_item DESC
    ");
    $stmt->execute([$panierId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $total = 0;
    foreach ($items as $it) {
        $total += ((float)$it["prix"] * (int)$it["quantity"]);
    }

    echo json_encode([
        "ok" => true,
        "items" => $items,
        "total" => $total
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "ok" => false,
        "message" => "Erreur serveur : " . $e->getMessage()
    ]);
}