# Future private analytics production authorization packet

This document is planning-only. This local candidate does not create or configure Firebase Authentication, Hosting, Functions, DNS, IAM, billing, secrets, OAuth, GA4 access, or a deployment.

## Target boundary

Use a FirstLine-controlled analytics subdomain with a private same-origin API. Firebase Authentication may provide Google sign-in; server-side authorization must allowlist reviewed owner UIDs and resolve only authorized site IDs. Firebase Hosting plus Functions, or an equivalent same-origin private API, may host the portal. Browser clients must never provide GA4 property IDs, credentials, endpoints, scopes, or authorization decisions.

## GA4 access model

A future server-side GA4 Data API adapter should implement the `Ga4AggregateAdapter` contract and return only the aggregate overview fields: users, sessions, views, engagement rate, and event count. Store reviewed property/stream references and grants server-side. Use a least-privilege service identity or delegated grant, keep credentials in managed secrets, log access without visitor or credential data, and prohibit raw user rows, IDs, query strings, acquisition/device tables, custom-event drilldowns, and client-side provider configuration.

## Site onboarding

For each site, record a stable site ID, canonical origin, display name, timezone, active status, capabilities, reviewed GA4 property/stream references, and authorized owner UIDs. Require a reviewed request, authorization validation, read-only connection test, fixture-to-live acceptance check, and rollback owner before activation.

## Required approvals before production work

1. Axel approval for a dedicated Firebase/GCP project, region, hosting/API architecture, and FirstLine-controlled analytics subdomain.
2. DNS/domain owner approval for the exact subdomain and TLS/hosting path.
3. Billing approval with budget alerts, quotas, and accountable cost owner.
4. IAM/security approval for deploy identity, owner UID allowlist process, Secret Manager access, logging/retention, and incident contact.
5. Privacy/consent and site-owner approval for the GA4 data purpose and authorized properties.
6. GA4 property owner approval for a read-only aggregate server-side grant.
7. Independent security and functional QA approval before deployment.

## Monitoring, costs, rollback

Monitor authentication failures, authorization denials, adapter errors, provider quota use, latency, deployment health, and cost/budget alerts without logging secrets or visitor identifiers. Define provider/API quotas and alert thresholds before enabling live calls. Roll back by disabling the live adapter/configuration, revoking the affected GA4 grant or owner UID, and reverting the deployed revision; preserve only sanitized operational evidence.

## Explicitly absent from this candidate

No production identity, Firebase project, Auth provider, Hosting, Functions, Firestore, DNS, IAM, billing, secret, OAuth client, GA4 credential/grant, provider request, deployment, publication, or client-site change exists in this worktree.