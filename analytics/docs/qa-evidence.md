# Local candidate validation

## Supported checks

This lean MVP is validated with the repository's TypeScript checks and a manual loopback smoke only:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:unit`
- `npm run test:contracts`
- `npm run test:security`
- `npm run test:e2e`

## Loopback API and Vite proxy smoke

Start the Express API on a free loopback port:

```sh
PORT=5184 HOST=127.0.0.1 npm run serve -w @firstline/api
```

Start the Vite preview on another free loopback port:

```sh
npm run dev -w @firstline/web -- --host 127.0.0.1 --port 5183
```

The preview at `http://127.0.0.1:5183` uses the same-origin relative `/api/v1` path and Vite's loopback proxy to reach the API. Verify the health, registry, authorized fixture-owner portfolio, ready-site aggregate, no-data range, unknown-site, and unauthenticated responses through the direct API and proxy. Stop both listeners after the smoke.

## Explicitly retired and excluded

The former Playwright screenshot/PDF workflow and custom evidence artifacts are retired. This candidate has no browser-operator script, generated browser evidence, or `test:browser` command.

Firebase emulator, Hosting, and Functions validation is also retired from this local candidate. The supported runtime is the Express loopback API plus Vite preview; neither Firebase resources nor provider calls are used.

Production identity, Firebase project/configuration, Auth provider, Hosting, Functions, DNS, IAM, billing, secrets, OAuth, GA4 credentials/grants, provider requests, and deployments remain out of scope.