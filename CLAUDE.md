# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use `uv run` as the package manager.

```bash
# Development server
uv run python manage.py runserver

# Run all tests
uv run python manage.py test

# Run a single test module
uv run python manage.py test meditation.tests.test_views
uv run python manage.py test meditation.tests.test_models
uv run python manage.py test meditation.tests.test_serializers

# Database migrations
uv run python manage.py makemigrations
uv run python manage.py migrate

# Install dependencies
uv sync
```

## Architecture

**Project layout**: `shunyata_server/` is the Django project config package; `meditation/` is the single Django app containing all models, views, serializers, and templates.

**Database**: PostgreSQL. Configure via env vars (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`). Copy `.env.example` to `.env` before first run.

**Authentication flow**: JWT via `djangorestframework-simplejwt`. New users register with `is_active=False`, receive a verification email containing a token link, and are activated on click. `EmailVerificationToken` in `meditation/models.py` handles token creation/expiry; expired tokens delete both the token and the inactive user.

**API surface**:
- `POST /api/auth/register/` — creates inactive user, sends verification email
- `GET /api/auth/verify-email/<token>/` — activates user
- `POST /api/auth/login/` / `POST /api/auth/refresh/` — JWT token endpoints (simplejwt)
- `GET/POST /api/meditations/sessions/` and `…/sessions/<id>/` — `MeditationSession` CRUD, scoped to authenticated user via `get_queryset`
- `GET /api/docs/` — Swagger UI (drf-spectacular)

**Template pages**: `/`, `/register/`, `/login/`, `/timer/`, `/stats/` render Django templates from `meditation/templates/meditation/`. These are server-rendered HTML pages; the login page receives `allowed_redirect_domains` from settings as context.

**Email in development**: Set `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env` to print emails to the terminal instead of sending them.

**Deployment**: Dockerfile uses `uv`, runs `collectstatic` at build time, and starts gunicorn with 3 workers. Static files served by WhiteNoise middleware.
