# Workspace Instructions

NestJS 11 TypeScript API using PostgreSQL, TypeORM migrations, JWT, class-validator, Swagger, and Jest.

## Setup Checklist

- [x] Verify this instruction file exists.
- [x] Clarify the API requirements from the supplied assessment.
- [x] Scaffold the NestJS project in the workspace root.
- [x] Implement auth, projects, tasks, validation, database, and documentation.
- [x] Install required extensions: none were specified.
- [ ] Compile and run the test suites; npm dependency installation is currently incomplete.
- [x] Create VS Code task: skipped because the npm scripts provide the required commands.
- [ ] Launch the API after user confirmation.
- [x] Keep README and workspace instructions current.

## Project Conventions

- Keep controllers focused on HTTP and put business logic in injectable services.
- Scope all project and task access to the authenticated user's ID.
- Use DTO validation and the global `ValidationPipe`; reject unknown input fields.
- Use TypeORM migrations; never enable schema synchronization for this project.
- Keep credentials in `.env`, which is ignored by Git. Commit only placeholder values in `.env.example`.
- Run `npm run build`, `npm test`, `npm run test:e2e`, and `npm run lint` before delivery.
