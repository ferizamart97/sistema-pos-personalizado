# CONTEXT.md — Sistema POS Personalizado

## Identificadores del Proyecto

| Campo | Valor |
|-------|-------|
| Repositorio GitHub | `ferizamart97/sistema-pos-personalizado` |
| Tipo | Sistema POS / SaaS |
| Desarrollador | ferizamart97 |

## Puertos Locales (Desarrollo)

| Servicio | Puerto |
|----------|--------|
| API Backend | 8080 |
| Panel Admin | 3001 |
| Caja POS | 3000 |
| pgAdmin 4 | 5050 |
| MailHog UI | 8025 |
| MailHog SMTP | 1025 |

## Subdominios de Producción (ferizamart97.dev)

| Subdominio | Servicio |
|------------|----------|
| `https://admin-pos.ferizamart97.dev` | Panel Administrativo |
| `https://pos.ferizamart97.dev` | Caja / Terminal POS Touch |
| `https://api-pos.ferizamart97.dev` | API REST Backend |

## Despliegue en VPS

| Campo | Valor |
|-------|-------|
| Host | 177.7.36.60 |
| Path prod | `/srv/pos-ferizamart/` |
| Traefik | SSL automático con Let's Encrypt |

## Ramas Git

| Rama | Propósito |
|------|-----------|
| `develop` | Desarrollo y pruebas |
| `main` | Producción — despliegue continuo |
