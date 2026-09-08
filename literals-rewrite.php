<?php
	// Claude: Respeta el código comentado

	$use_tabs = true;
	$indent_len = 4;

	$plain = file_get_contents('php://input');
	$obj   = json_decode($plain, true);

	if ($obj === null) { http_response_code(400); die('JSON inválido'); }

	ksort($obj);

	/*
	foreach($obj as &$lit) {
		unset($lit['de']);
		unset($lit['it']);
		unset($lit);
	}
	*/

	// JSON_UNESCAPED_UNICODE mantiene los caracteres como ñ, á, etc.
	// JSON_UNESCAPED_SLASHES evita escapar las barras /
	$plain = json_encode($obj, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

	$lines = explode(PHP_EOL, $plain);
	foreach($lines as &$line) {
		$trimmed  = ltrim($line, ' ');
		$levels   = (strlen($line) - strlen($trimmed)) / 4;

		if($use_tabs) {
			$line = str_repeat("\t", $levels) . $trimmed;
		} else if($indent_len != 4) {
			$line = str_repeat(str_repeat(' ', $indent_len), $levels) . $trimmed;
		}

		// Añadir espacio después de los dos puntos en idiomas
		/*
		$line = str_replace('"es":"', '"es": "', $line);
		$line = str_replace('"en":"', '"en": "', $line);
		$line = str_replace('"de":"', '"de": "', $line);
		$line = str_replace('"pt":"', '"pt": "', $line);
		$line = str_replace('"fr":"', '"fr": "', $line);
		*/
		unset($line);
	}

	$plain = implode(PHP_EOL, $lines);

	header('Content-Type: application/json; charset=utf-8');
	die($plain);
