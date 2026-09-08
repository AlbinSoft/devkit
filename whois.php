<?php
header('Content-Type: application/json; charset=utf-8');

function whois_raw(string $target, string $server, int $timeout = 10): string|false {
	$sock = @fsockopen($server, 43, $errno, $errstr, $timeout);
	if (!$sock) return false;
	stream_set_timeout($sock, $timeout);
	fwrite($sock, $target . "\r\n");
	$buf = '';
	while (!feof($sock)) {
		$chunk = fread($sock, 4096);
		if ($chunk === false) break;
		$buf .= $chunk;
	}
	fclose($sock);
	return $buf;
}

$target = trim($_GET['q'] ?? '');

// Solo hostnames e IPv4 — bloquea command injection aunque aquí no se ejecute nada
if (empty($target) || strlen($target) > 253 || !preg_match('/^[a-zA-Z0-9.\-]+$/', $target)) {
	echo json_encode(['error' => 'Invalid input.']);
	exit;
}

// Paso 1: consultar IANA para obtener el servidor autoritativo
$iana = whois_raw($target, 'whois.iana.org');
if ($iana === false) {
	echo json_encode(['error' => 'Could not connect to whois.iana.org']);
	exit;
}

$server = 'whois.iana.org';
$result = $iana;

// Paso 2: seguir el campo refer: o whois: si existe
if (preg_match('/^(?:refer|whois):\s+(\S+)/im', $iana, $m)) {
	$ref    = trim($m[1]);
	$follow = whois_raw($target, $ref);
	if ($follow !== false) {
		$server = $ref;
		$result = $follow;
	}
}

echo json_encode(['server' => $server, 'text' => $result]);
