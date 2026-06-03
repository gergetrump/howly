# Challenge integration TODOs

- Mount `challenge.routes.js` in `src/app.js`.
- Replace `canCreateChallenge()` in `challenge.service.js` with the real premium/subscription field when it exists on `User`.
- Connect habit completion to `recordProgress()` so a checked habit increments the matching participant's `daysCompleted`.
- Decide how a challenge maps to a real habit record. The current model stores `habitTitle` as a lightweight placeholder.
- Add friend/invite checks before joining private friend challenges once the friends feature exists.
