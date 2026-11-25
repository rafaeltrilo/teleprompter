<?php
/* Sincronia do Teleprompter em hospedagem Apache (sem Node).
   A mesa publica o estado; as telas perguntam por mudanças (polling curto).
   A precisão NÃO depende da latência: rolagem e cronômetro são calculados a
   partir de marcas de tempo, então 300ms de atraso não desalinham nada.

   Endpoints:
     GET  api.php?a=ping
     GET  api.php?a=time
     GET  api.php?a=state&sala=X&rev=N   -> 204 se nada mudou, senão o estado
     POST api.php?a=state&sala=X         -> publica o estado (corpo JSON)      */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Accel-Buffering: no');

$a    = $_GET['a'] ?? 'state';
$sala = strtoupper(preg_replace('/[^A-Za-z0-9_\-]/', '', $_GET['sala'] ?? 'PALCO-1'));
if ($sala === '') $sala = 'PALCO-1';

$dir = __DIR__ . '/.dados';
if (!is_dir($dir)) @mkdir($dir, 0775, true);
$file = $dir . '/' . $sala . '.json';

function agora_ms() { return (int) round(microtime(true) * 1000); }

if ($a === 'ping') { echo json_encode(['ok' => true, 't' => agora_ms()]); exit; }
if ($a === 'time') { echo json_encode(['t' => agora_ms()]); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 2000000) { http_response_code(413); echo '{"erro":"grande demais"}'; exit; }
    $st = json_decode($raw, true);
    if (!is_array($st)) { http_response_code(400); echo '{"erro":"json invalido"}'; exit; }
    file_put_contents($file, json_encode($st), LOCK_EX);
    http_response_code(204); exit;
}

/* GET: resposta imediata — devolve o estado só se mudou (rev diferente da do
   cliente), senão 204. Nada de segurar conexão: em hospedagem compartilhada
   isso ocuparia os workers do Apache. O cliente pergunta a cada ~500ms e a
   precisão não sofre, porque rolagem e cronômetro vêm de marcas de tempo. */
$rev = (float) ($_GET['rev'] ?? 0);
clearstatcache(true, $file);
if (is_file($file)) {
    $st = json_decode((string) file_get_contents($file), true);
    if (is_array($st) && (float) ($st['rev'] ?? 0) !== $rev) {
        echo json_encode(['estado' => $st, 't' => agora_ms()]);
        exit;
    }
}
http_response_code(204);
