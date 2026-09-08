<?php
// Desactivar output buffering para streaming SSE en tiempo real
@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', false);
while (ob_get_level()) ob_end_clean();
ob_implicit_flush(true);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

function sse(array $data): void {
	echo 'data: ' . json_encode($data) . "\n\n";
	flush();
}

$host    = trim($_GET['host']    ?? '');
$maxhops = (int)($_GET['maxhops'] ?? 30);

// Solo permitir hostnames válidos e IPv4 — bloquea command injection
if (empty($host) || strlen($host) > 253 || !preg_match('/^[a-zA-Z0-9.\-]+$/', $host)) {
	sse(['error' => 'Invalid host. Only hostnames and IPv4 addresses are allowed.']);
	exit;
}

$maxhops = max(1, min(64, $maxhops));

if (PHP_OS_FAMILY === 'Windows') {
	$cmd = 'tracert -h ' . $maxhops . ' ' . escapeshellarg($host) . ' 2>&1';
} else {
	$cmd = 'traceroute -m ' . $maxhops . ' ' . escapeshellarg($host) . ' 2>&1';
}

$proc = popen($cmd, 'r');
if (!$proc) {
	sse(['error' => 'Could not run traceroute.']);
	exit;
}

while (!feof($proc)) {
	$line = fgets($proc, 4096);
	if ($line !== false) {
		$line = rtrim($line);
		if ($line !== '') {
			sse(['line' => $line]);
		}
	}
}

pclose($proc);
sse(['done' => true]);
