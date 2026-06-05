<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . "/../config/db.php";

$userId = (int)($_GET["user_id"] ?? ($_GET["current_user_id"] ?? 0));

if ($userId <= 0) {
    echo json_encode(["ok" => true, "annonces" => []], JSON_UNESCAPED_UNICODE);
    exit;
}

/* Colonnes renvoyées : identiques à annonces.php pour réutiliser la même carte côté mobile. */
$selectCols = "
    a.id_annonce,
    a.id_vendeur,
    a.titre,
    a.description,
    a.prix,
    a.ancien_prix,
    a.ville,
    a.stock,
    a.mode_vente,
    a.cover_image,
    a.date_publication,
    a.categorie,
    a.marque,
    u.nom AS vendeur_nom,
    EXISTS(
        SELECT 1 FROM favoris f
        WHERE f.id_annonce = a.id_annonce AND f.id_user = ?
    ) AS is_favori
";

try {
    /* Conditions de base : annonces actives, pas les miennes, pas déjà en favori. */
    $baseWhere = [
        "a.statut = 'ACTIVE'",
        "a.id_vendeur <> ?",
        "a.id_annonce NOT IN (SELECT id_annonce FROM favoris WHERE id_user = ?)",
    ];

    $orderBy = "COALESCE(a.nb_vues, 0) DESC, a.date_publication DESC, a.id_annonce DESC";

    /* 1) Préférences déduites des favoris (catégorie / marque). */
    $stmtPrefs = $pdo->prepare("
        SELECT a.categorie, a.marque, COUNT(*) AS score_pref
        FROM favoris f
        JOIN annonce a ON a.id_annonce = f.id_annonce
        WHERE f.id_user = ?
          AND a.categorie IS NOT NULL
          AND a.categorie <> ''
        GROUP BY a.categorie, a.marque
        ORDER BY score_pref DESC
        LIMIT 10
    ");
    $stmtPrefs->execute([$userId]);
    $prefs = $stmtPrefs->fetchAll(PDO::FETCH_ASSOC);

    $recommended = [];

    if (count($prefs) > 0) {
        $orParts = [];
        $prefParams = [];

        foreach ($prefs as $p) {
            $cat = trim((string)($p["categorie"] ?? ""));
            $mar = trim((string)($p["marque"] ?? ""));

            if ($cat !== "" && $mar !== "") {
                $orParts[] = "(a.categorie = ? AND a.marque = ?)";
                $prefParams[] = $cat;
                $prefParams[] = $mar;
            } elseif ($cat !== "") {
                $orParts[] = "(a.categorie = ?)";
                $prefParams[] = $cat;
            }
        }

        if (count($orParts) > 0) {
            $where = $baseWhere;
            $where[] = "(" . implode(" OR ", $orParts) . ")";

            $sql = "
                SELECT DISTINCT $selectCols
                FROM annonce a
                JOIN user u ON u.id_user = a.id_vendeur
                WHERE " . implode(" AND ", $where) . "
                ORDER BY $orderBy
                LIMIT 8
            ";

            $stmt = $pdo->prepare($sql);
            // ordre des ? : is_favori(userId), id_vendeur<>(userId), NOT IN(userId), puis prefs
            $stmt->execute(array_merge([$userId, $userId, $userId], $prefParams));
            $recommended = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    /* 2) Fallback : les plus populaires / récentes. */
    if (count($recommended) === 0) {
        $sql = "
            SELECT $selectCols
            FROM annonce a
            JOIN user u ON u.id_user = a.id_vendeur
            WHERE " . implode(" AND ", $baseWhere) . "
            ORDER BY $orderBy
            LIMIT 8
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $userId, $userId]);
        $recommended = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        "ok" => true,
        "annonces" => $recommended,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "ok" => false,
        "message" => "Erreur serveur : " . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
