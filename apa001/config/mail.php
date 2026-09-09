<?php
/**
 * Configuración de correo electrónico (PHPMailer)
 */
return [
    'host' => getenv('MAIL_HOST') ?: 'mailhog',
    'port' => (int)(getenv('MAIL_PORT') ?: 1025),
    'username' => getenv('MAIL_USERNAME') ?: '',
    'password' => getenv('MAIL_PASSWORD') ?: '',
    'encryption' => getenv('MAIL_ENCRYPTION') ?: '',
    'from_address' => getenv('MAIL_FROM_ADDRESS') ?: 'pos@mitienda.com',
    'from_name' => getenv('MAIL_FROM_NAME') ?: 'Sistema POS',
];
