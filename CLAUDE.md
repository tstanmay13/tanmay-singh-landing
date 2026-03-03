# Project Guidelines

This project follows the Claude Code orchestration pattern for all development tasks.

## Workflow Orchestration

### Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### Context Management
- Before compacting or when context is getting long, write current state to `tasks/context-state.md`
- After compacting, immediately read `tasks/context-state.md` to restore awareness
- Proactively compact when context feels heavy — don't wait until forced to

### Subagent Strategy
- Use subagents liberally to keep main context window clean
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### Self-Improvement Loop
- After ANY correction: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake

### Verification Before Done
- Never mark a task complete without proving it works
- Ask: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## Task Workflow

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Document Results**: Add review section to `tasks/todo.md`

## Testing Pattern (Builder-Validator)

- **Builder**: Builds the feature AND runs tests. If tests fail, it fixes them.
- **Validator**: Independently verifies — runs test suite separately.
- If both agree it passes → it passes

### What You Get Back
- From builder: "Changed 3 files, added 2 tests, 47/47 pass"
- From validator: "Verified independently. 47/47 pass."

## Git Conventions

- Write clear, descriptive commit messages explaining WHY not WHAT
- One logical change per commit
- Always run tests before pushing
- Create PRs with summary, test plan
- Never force push to main/master

## Code Review Standards

- Review your own diff before presenting it
- Check for: unused imports, debug logs, hardcoded values, missing error handling
- Ensure backwards compatibility unless explicitly breaking
