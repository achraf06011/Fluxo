<?php
require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/config/auth.php";
requireLogin();

header("Content-Type: application/json");

require_once __DIR__ . "/vendor/autoload.php";
$cfg = require __DIR__ . "/config/stripe.php";

\Stripe\Stripe::setApiKey($cfg["secret_key"]);

$userId = currentUserId();


$data = json_decode(file_get_contents("php://input"), true);

$amount = isset($data["amount"]) ? (float)$data["amount"] : 0;

if ($amount <= 0) {
  echo json_encode(["error" => "Montant invalide"]);
  exit;
}


$amountStripe = (int)($amount * 100);

try {

  $session = \Stripe\Checkout\Session::create([
    "payment_method_types" => ["card"],
    "mode" => "payment",

    "line_items" => [[
      "price_data" => [
        "currency" => $cfg["currency"],
        "product_data" => [
          "name" => "Commande Fluxo",
        ],
        "unit_amount" => $amountStripe,
      ],
      "quantity" => 1,
    ]],

    "success_url" => "http://192.168.1.13/stripe_success.php?session_id={CHECKOUT_SESSION_ID}",
    "cancel_url" => "http://192.168.1.13/stripe_cancel.php",

    "metadata" => [
      "user_id" => $userId
    ]
  ]);

  echo json_encode([
    "url" => $session->url
  ]);

} catch (Exception $e) {
  echo json_encode([
    "error" => $e->getMessage()
  ]);
}