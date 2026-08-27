interface ImportMetaEnv {
  /**
   * Cloudflare Turnstile's site key for the support form. Public by design,
   * but still configuration: with none set, no widget renders and no
   * third-party script loads. The API skips verification in the same way when
   * its own `TURNSTILE_SECRET_KEY` secret is unset, so the two are switched on
   * together. See the SEO/Support section of the README.
   */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
