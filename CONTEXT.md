# CONTEXT.md — Sistema POS Personalizado (a001)

## Identificadores SomosIM

| Campo | Valor |
|-------|-------|
| ID Sistema | `pa001` |
| GitHub Repo | `ferizamart97/sistema-pos-personalizado` |
| Tipo | Cliente / SaaS |

## Puertos Locales (Desarrollo)

| Servicio | Puerto |
|----------|--------|
| API Backend | 8080 |
| Panel Admin | 3001 |
| Caja POS | 3000 |
| pgAdmin | 5050 |
| MailHog UI | 8025 |
| MailHog SMTP | 1025 |

## FQDNs Producción

| Dominio | Servicio |
|---------|---------|
| `https://pos.somosin.mx` | Panel Admin |
| `https://pos.ferizamart97.dev` | Panel Admin |
| `https://caja.somosin.mx` | Caja / Terminal POS |
| `https://caja.ferizamart97.dev` | Caja / Terminal POS |
| `https://api-pos.somosin.mx` | API REST |
| `https://api-pos.ferizamart97.dev` | API REST |

## VPS

| Campo | Valor |
|-------|-------|
| Host | 177.7.36.60 |
| Proveedor | Hostinger |
| Path prod | `/srv/somosim/pa001/` |
| Traefik | Red `traefik-net` (external) |

## Ramas Git

| Rama | Propósito |
|------|-----------|
| `develop` | Desarrollo y pruebas |
| `main` | Producción — dispara CI/CD |
