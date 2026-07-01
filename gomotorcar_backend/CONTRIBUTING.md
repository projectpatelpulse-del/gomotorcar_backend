# Contributing

Thanks for contributing! Please follow these guidelines to keep the project maintainable.

- Create a new branch for each feature or bugfix: `git checkout -b feat/my-feature`.
- Keep commits small and focused; write meaningful commit messages.
- Add unit/integration tests for new logic where possible.
- Run the app locally and verify endpoints before creating a PR.
- Use the project's response helpers and `asyncHandler` for controllers.
- Document any breaking changes in the PR description.

PR checklist
- [ ] Code compiles and server starts
- [ ] New code follows project structure (`models`, `controllers`, `routes`)
- [ ] Added/updated README or DEVELOPMENT notes if the change affects setup
- [ ] Swagger docs updated if new endpoints are introduced (see `src/docs/swagger.js`)

If you're unsure about implementation details, open an issue or ping a maintainer.
