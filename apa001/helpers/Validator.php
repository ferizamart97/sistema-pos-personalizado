<?php
namespace App\helpers;

/**
 * Validador de datos de entrada
 * Reglas soportadas: required, email, min:N, max:N, numeric, in:val1,val2
 */
class Validator
{
    /**
     * Validar datos contra reglas definidas
     * @return array Errores encontrados (vacío si todo válido)
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $fieldRules = explode('|', $ruleString);
            $value = $data[$field] ?? null;

            foreach ($fieldRules as $rule) {
                $params = [];

                // Separar nombre de regla y parámetros (ej: min:3)
                if (str_contains($rule, ':')) {
                    [$rule, $paramString] = explode(':', $rule, 2);
                    $params = explode(',', $paramString);
                }

                switch ($rule) {
                    case 'required':
                        if ($value === null || $value === '') {
                            $errors[$field][] = "El campo {$field} es obligatorio.";
                        }
                        break;

                    case 'email':
                        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = "El campo {$field} debe ser un email válido.";
                        }
                        break;

                    case 'min':
                        $min = (int) $params[0];
                        if ($value !== null && strlen($value) < $min) {
                            $errors[$field][] = "El campo {$field} debe tener al menos {$min} caracteres.";
                        }
                        break;

                    case 'max':
                        $max = (int) $params[0];
                        if ($value !== null && strlen($value) > $max) {
                            $errors[$field][] = "El campo {$field} no debe exceder {$max} caracteres.";
                        }
                        break;

                    case 'numeric':
                        if ($value !== null && $value !== '' && !is_numeric($value)) {
                            $errors[$field][] = "El campo {$field} debe ser numérico.";
                        }
                        break;

                    case 'in':
                        if ($value !== null && $value !== '' && !in_array($value, $params)) {
                            $allowed = implode(', ', $params);
                            $errors[$field][] = "El campo {$field} debe ser uno de: {$allowed}.";
                        }
                        break;

                    case 'date':
                        if ($value !== null && $value !== '') {
                            $date = \DateTime::createFromFormat('Y-m-d', $value);
                            if (!$date || $date->format('Y-m-d') !== $value) {
                                $errors[$field][] = "El campo {$field} debe ser una fecha válida (YYYY-MM-DD).";
                            }
                        }
                        break;

                    case 'integer':
                        if ($value !== null && $value !== '' && !ctype_digit(strval($value))) {
                            $errors[$field][] = "El campo {$field} debe ser un número entero.";
                        }
                        break;
                }
            }
        }

        return $errors;
    }
}
