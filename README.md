# Task Management System

## Project overview

This project is a backend API for a task-management application. It lets people
create an account, sign in, manage their own projects, and track tasks within
those projects. The API also provides password-reset emails and interactive
documentation for trying the endpoints.

The current deliverable is the API and its PostgreSQL database setup. A
browser-based frontend is not included in this repository.

## Project progress

The project has grown from the core account and task-management API into a
documented service with database migrations and a password-recovery flow:

1. **API foundation** — NestJS application structure, configuration validation,
   PostgreSQL connection, health endpoint, and shared request validation.
2. **Accounts and access control** — account registration, password hashing,
   JWT login, authenticated profile access, and user-scoped project/task
   operations.
3. **Project and task management** — CRUD endpoints for projects and tasks,
   task filtering/pagination, and ownership enforced by the API.
4. **Database and API documentation** — TypeORM entities and migrations,
   Swagger UI at `/docs`, and bearer-token authorization in Swagger.
5. **Password recovery** — rate-limited forgot/reset endpoints, SMTP email
   delivery, short-lived single-use reset tokens stored as hashes, and tests.

## Current functionality

| Area              | What is available                                                                    |
| ----------------- | ------------------------------------------------------------------------------------ |
| Health            | `GET /health`                                                                        |
| Accounts          | `POST /auth/register`, `POST /auth/login`, authenticated `GET /auth/me`              |
| Password recovery | `POST /auth/forgot-password` and `POST /auth/reset-password`                         |
| Projects          | Authenticated create, list, view, update, and delete at `/projects`                  |
| Tasks             | Authenticated create, list, view, update, and delete at `/projects/:projectId/tasks` |
| Task listing      | Pagination, status filtering, and due-date sorting                                   |
| API documentation | Swagger UI at `http://localhost:3000/docs`                                           |

Project and task access is scoped to the authenticated account. Request DTOs
are validated globally; unknown fields are rejected. Password-reset requests
use an enumeration-resistant response for unknown email addresses, and reset
tokens expire after 15 minutes and can only be used once.

## Tools and technologies

- **NestJS 11 and TypeScript** — API framework and application structure.
- **PostgreSQL 16 and pgAdmin** — PostgreSQL is the database server running on
  the developer's machine. pgAdmin is the graphical client used to connect to
  and manage that server; it is not itself the database server.
- **TypeORM** — persistence, entities, and versioned SQL migrations. Automatic
  schema synchronization is disabled.
- **Passport and JWT** — authenticate API requests with bearer tokens.
- **bcryptjs** — hash account passwords.
- **class-validator and class-transformer** — validate and transform request
  DTOs.
- **Swagger / OpenAPI** — interactive API documentation.
- **Nodemailer and SMTP** — send password-reset email through an SMTP provider.
- **Joi, Helmet, and Nest throttling** — configuration checks, HTTP security
  headers, and request rate limits.
- **Jest and Supertest** — unit and HTTP end-to-end tests.
- **Oxlint and Prettier** — linting and formatting.

## Run the project locally

### Requirements

- Node.js 20 or newer and npm.
- PostgreSQL 16 installed and running on the developer's machine.
- pgAdmin, if you want a graphical tool to manage the PostgreSQL server.
- An SMTP account if you want to test email delivery.

### Setup

1. Install dependencies from the lockfile:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env`. Keep `.env` local and replace `JWT_SECRET`
   with a random secret of at least 32 characters.
3. Make sure your local PostgreSQL server is running. In pgAdmin, connect to
   that server and create a database named `tasks` if it does not already
   exist. pgAdmin is only the management client; the PostgreSQL server service
   must be running independently.
4. Set `DATABASE_URL` in `.env` to your local PostgreSQL connection details.
   Replace the username and password in the example with the values configured
   for your PostgreSQL server. Apply the database migrations:

   ```sh
   npm run migration:run
   ```

5. Start the API in watch mode:

   ```sh
   npm run start:dev
   ```

The API listens on `http://localhost:3000` by default. Open
`http://localhost:3000/docs` for Swagger or `http://localhost:3000/health` for
the health endpoint. The API root (`/`) does not have a route.

Docker Compose configuration is also included as an optional alternative for
running PostgreSQL in a container. It is not needed when using the PostgreSQL
server installed on your system. Avoid starting both local and containerized
PostgreSQL on port `5432` at the same time unless you change one server's port.

## Environment configuration

| Variable             | Required                 | Purpose                                                                                                                     |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Yes                      | PostgreSQL connection string for your local server, usually at `localhost:5432`; use your PostgreSQL username and password. |
| `JWT_SECRET`         | Yes                      | Secret used to sign access tokens; at least 32 characters.                                                                  |
| `PORT`               | No                       | API port; defaults to `3000`.                                                                                               |
| `CORS_ORIGIN`        | No                       | Comma-separated browser origins allowed by CORS.                                                                            |
| `SMTP_HOST`          | For password-reset email | SMTP server hostname.                                                                                                       |
| `SMTP_PORT`          | No                       | SMTP port; defaults to `587`; port `465` enables secure SMTP.                                                               |
| `SMTP_USER`          | Provider-dependent       | SMTP username; configure together with `SMTP_PASSWORD`.                                                                     |
| `SMTP_PASSWORD`      | Provider-dependent       | SMTP password; configure together with `SMTP_USER`.                                                                         |
| `MAIL_FROM`          | With `SMTP_HOST`         | Valid sender email address supplied by the email provider.                                                                  |
| `PASSWORD_RESET_URL` | With `SMTP_HOST`         | Frontend reset-password page; the API adds the token query parameter.                                                       |

The SMTP values in `.env.example` are examples/placeholders, not working
credentials. A sandbox provider such as Mailtrap is suitable for development.
Never commit real SMTP credentials, JWT secrets, or `.env`.

## Using password recovery

1. Configure valid SMTP settings and `PASSWORD_RESET_URL` in `.env`.
2. Apply migrations, including the password-reset-token migration.
3. Call `POST /auth/forgot-password` with:

   ```json
   { "email": "alex@example.com" }
   ```

4. Open the email link in the frontend. The link contains a `token` query
   parameter.
5. Submit the token and a new password to `POST /auth/reset-password`:

   ```json
   {
     "token": "token-from-the-email-link",
     "newPassword": "a-new-password-at-least-12-characters"
   }
   ```

The reset token is random, stored only as a SHA-256 hash, expires after
15 minutes, and is invalidated after a successful password change. If SMTP is
not configured, the API reports that email delivery is unavailable rather than
claiming that an email was sent.

## Authentication in Swagger

Register or log in through Swagger to obtain an `accessToken`. Select
**Authorize** and enter the token in the bearer authentication field. Swagger
will then include it when calling protected project and task endpoints.

## Database migrations

The database schema is managed by TypeORM migrations; do not turn on
`synchronize`. The repository currently contains an initial schema migration
and a migration for password-reset tokens.

Generate a migration after changing database entities:

```sh
npm run migration:generate -- src/database/migrations/DescribeChange
npm run migration:run
```

Revert the most recently applied migration with:

```sh
npm run migration:revert
```

## Tests and quality checks

```sh
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run lint
```

The end-to-end tests use the configured PostgreSQL database. Start the
database and apply migrations before running them.

## Known limitations and next steps

- **No frontend is included.** A web or mobile client still needs to provide
  the reset-password page configured by `PASSWORD_RESET_URL`.
- **Email delivery depends on external SMTP configuration.** The repository
  does not include a real provider account or credentials; `.env.example`
  cannot send actual mail.
- **The example database and mail settings are for local development.** A
  deployment needs managed PostgreSQL, production SMTP, secure secrets, and
  production-specific CORS settings.
- **Access tokens expire after 15 minutes.** Refresh tokens and a token
  revocation/session-management flow are not currently implemented.
- **Account roles are represented in user data and JWTs, but a role-based
  permissions system is not implemented.** Project/task authorization is
  currently based on ownership.
- **Email delivery is tested through a mocked mailer in unit tests.** Real
  SMTP delivery and provider-specific behavior must be verified with the
  chosen provider.
- **Operational features such as deployment automation, monitoring, and
  production email/database observability remain future work.**
