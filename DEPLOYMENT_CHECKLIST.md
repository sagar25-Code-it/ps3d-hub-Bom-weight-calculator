# PS3D Hub deployment checklist

## Before committing

1. Work in a real clone of the repository. Do not use an additive browser upload for a release.
2. Copy the complete release into the repository root.
3. Confirm `index.html`, `styles.css`, `package.json`, and `vercel.json` are siblings.
4. Run:

   ```bash
   npm run preflight
   git ls-files --error-unmatch styles.css
   git status --short
   git diff --cached --name-status
   ```

5. `styles.css` must be tracked. `.env` and other environment files must not be tracked.

## Repository cleanup required for the current public repository

The repository version inspected on 28 July 2026 contains stale files from the earlier application. Remove these exact tracked paths before deployment:

```bash
git rm --cached -- .env
git rm -- contact.js api/save-user.js
git add -- .env.example .gitignore styles.css
```

Keep the local `.env` file only if needed for development. Because it was committed publicly, rotate any values it contained; removing it from the newest commit does not remove it from history.

## Preview and production verification

Deploy to a Vercel preview first, then run:

```bash
npm run check:deployment -- https://your-preview-domain.vercel.app
```

Only promote the deployment after all 12 checks pass. After production deploy:

1. Open `https://your-production-domain/styles.css`.
2. Confirm it returns CSS and not `404: NOT_FOUND`.
3. Hard-refresh the app once (`Ctrl+Shift+R`).
4. Calculate a 20 mm × 1 m E250A round bar and confirm `2.46615 kg`.
