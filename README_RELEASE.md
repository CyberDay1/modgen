# ModGen Release Process

1. Update version:
   ```bash
   npm version patch
   git push --follow-tags
   ```
2. GitHub Actions will build and upload release artifacts automatically.
3. Verify the release in [GitHub Releases](https://github.com/CyberDay1/modgen/releases).
4. Update CHANGELOG.md manually or with `npm run changelog` if configured.
