# Security Policy

The security of customer data, transactions, user sessions, and backups is important to Buku Piutang. This document explains which versions are supported and how to report a suspected vulnerability safely.

## Supported Versions

| Version | Security Support |
| --- | --- |
| Latest `main` branch | Supported |
| Production deployment from the latest `main` branch | Supported |
| Development branches, old previews, or third-party forks | Not supported |

The project does not currently publish numbered releases. Security fixes are provided on the latest `main` branch.

## Reporting a Vulnerability

Do not open a public issue containing vulnerability details, customer data, tokens, passwords, or exploitation steps.

Use one of the following methods:

1. Open the repository's [private vulnerability reporting page](https://github.com/tirsasaki/bukuhutang-v2/security/advisories/new) and submit a new report.
2. If private vulnerability reporting is unavailable, open a public issue without sensitive details titled **Request for a private security reporting channel**. A maintainer will provide a private channel for the full report.

Include the following information when possible:

- A concise summary of the issue and its potential impact.
- The affected application area, API route, or code version.
- Minimal and repeatable reproduction steps.
- A proof of concept that does not use another user's data.
- A suggested fix or mitigation, if available.
- A safe way to contact the reporter during remediation.

## Response Targets

The project aims to:

- Acknowledge a report within three business days.
- Provide an initial impact assessment within seven business days.
- Share periodic updates until a fix or mitigation is available.

Remediation time depends on severity, complexity, and deployment coordination. Reporters of valid findings will be notified before vulnerability details are made public.

## Primary Scope

The following reports are treated as a priority:

- Unauthorized access or user session takeover.
- Cross-account data exposure caused by an RLS or `owner_id` authorization failure.
- Unauthorized modification or deletion of customers, debts, payments, cashiers, or store settings.
- Access to another user's backups, backup path manipulation, or GitHub token exposure.
- Injection, cross-site scripting (XSS), request forgery, or code execution.
- Secret exposure through logs, API responses, files, or deployments.
- Import process abuse that can compromise data integrity.

The following findings are generally out of scope unless they demonstrate a concrete security impact:

- Automated dependency version reports without an application-specific exploitation path.
- Problems that only affect unsupported browsers.
- General hardening suggestions without a demonstrable risk.
- Attacks that require full control of the owner's Supabase, GitHub, or Vercel account.

## Safe Testing Rules

- Test only accounts, data, and environments that you own or are authorized to assess.
- Do not access, modify, download, or delete another user's data.
- Do not perform denial-of-service attacks, mass scanning, social engineering, or testing that disrupts production service.
- Stop testing immediately if another user's data becomes visible, and report the finding without retaining a copy.
- Limit proofs of concept to the minimum action required to demonstrate the issue.

## Exposed Secrets

If a token or secret is found in source code, logs, or a deployment:

1. Do not copy or use it beyond the minimum verification required.
2. Report its location privately.
3. The project owner should revoke and rotate the secret immediately.
4. Review Supabase, GitHub, and Vercel access logs for unrecognized activity.
5. Redeploy the application after updating its environment variables.

Thank you for helping keep Buku Piutang and its users' data secure.
