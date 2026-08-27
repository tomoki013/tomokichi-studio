/**
 * The shared asset-cache Worker is plain JavaScript in `packages/app-site`,
 * so it arrives here untyped. Declaring the one shape this app uses keeps
 * `astro check` clean without reaching into a package every brand site shares.
 */
declare module "@tomokichi/app-site/asset-cache-worker" {
  interface AssetCacheEnv {
    ASSETS: { fetch(request: Request): Promise<Response> };
  }
  const worker: {
    fetch(request: Request, env: AssetCacheEnv): Promise<Response>;
  };
  export default worker;

  /** The site's own error page, for failures this Worker handles itself. */
  export function errorPage(
    request: Request,
    env: AssetCacheEnv,
    status: number,
  ): Promise<Response>;
}
