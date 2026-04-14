# Security Policy — MEEET World

## Reporting a Vulnerability

If you discover a security vulnerability in MEEET World, please report it responsibly.

**Email:** [alxvasilevv@gmail.com](mailto:alxvasilevv@gmail.com)

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code

We will acknowledge receipt within **48 hours** and provide an initial assessment within **5 business days**. Please do not disclose the vulnerability publicly until we have released a fix.

## Secrets Policy

1. **No literal secrets in source code.** All API keys, tokens, and private keys must be read from environment variables at runtime.
2. **Edge Functions** use `Deno.env.get("SECRET_NAME")` to access secrets configured via Lovable Cloud / Supabase Vault.
3. **Frontend code** may only reference **publishable** keys (e.g., Supabase anon key) via `import.meta.env.VITE_*`. Private keys must never appear in client-side code.
4. **SDK examples** may embed the publishable anon key for convenience, but must never contain service role keys, bot tokens, or private keys.
5. **`.env` files** are git-ignored and must never be committed. Use `.env.example` as a template.
6. **Code review** — every PR must be checked for accidental secret inclusion before merge.

## Key Rotation Schedule

| Trigger | Action |
|---|---|
| **Routine** | Rotate all secrets every **90 days** |
| **Exposure** | Rotate **immediately** upon any suspected or confirmed leak |
| **Personnel change** | Rotate all secrets an outgoing team member had access to |
| **Dependency breach** | Rotate secrets for any affected integration within **24 hours** |

After rotation, update the secret in Lovable Cloud (or Supabase Vault) and verify all dependent services still function correctly.
