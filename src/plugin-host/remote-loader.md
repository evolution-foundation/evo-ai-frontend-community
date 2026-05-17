# Plugin Host — Remote Loader Requirements (future)

The MVP host only registers plugins that ship as in-tree JavaScript modules,
through a synchronous `registerPlugin(manifest)` call made from the consumer's
own entry module. There is no remote fetch, no `eval`, no dynamic `import()`
of arbitrary URLs.

A future evolution that allows third parties to ship plugins as remote bundles
loaded at runtime MUST satisfy the requirements below before any code from a
remote origin executes in the user's browser. None of these are implemented
today; they are recorded here as a contract for whoever lands that work.

## Required guarantees

1. **Allowlist of origins.** The host accepts a remote bundle only from an
   origin explicitly listed in a host-controlled allowlist (build-time or
   delivered via a signed configuration). The allowlist is not editable by
   end users.
2. **Signature verification.** Each remote bundle ships with a detached
   signature produced by a key that the host trusts. The host verifies the
   signature against the bundle bytes before evaluating the bundle. A failed
   verification rejects the load with a logged error and never falls back to
   the unsigned bundle.
3. **Subresource Integrity.** When the bundle is served over HTTP, the host
   uses SRI hashes that match the signed manifest. A hash mismatch rejects
   the load.
4. **Manifest schema validation.** The plugin manifest returned by the bundle
   is validated against the public TypeScript types before any slot, route,
   provider or guard from that manifest is wired into the host. Unknown or
   malformed fields are dropped, not silently accepted.
5. **Permission scope is opt-in.** A remote plugin declares which slots,
   route namespaces and capabilities it intends to use; the host enforces
   that declaration at registration time.
6. **Isolation.** A remote plugin runs inside the same error boundary
   isolation the in-tree host already provides; a crash in a remote plugin
   never derails the shell.

## Non-goals

- The host does not become a generic JavaScript sandbox. Defense in depth
  comes from CSP, the allowlist and the signature, not from runtime
  isolation primitives such as iframes or workers in the MVP.
- The host does not ship a UI for managing the allowlist. That belongs to
  whichever operator deploys the shell.

## Out of scope for this story

- This document is the contract; the implementation lives in a follow-up
  story once a real consumer needs remote loading. The MVP exposes only the
  in-memory `registerPlugin` path.
