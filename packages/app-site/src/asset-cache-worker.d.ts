export interface AssetCacheEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  APPLE_APP_ID?: string;
  APPLE_APP_IDS?: string;
  APP_STORE_URL?: string;
  UNIVERSAL_LINK_PATHS?: string;
  UNIVERSAL_LINK_FALLBACK_PATH?: string;
}

declare const worker: {
  fetch(request: Request, env: AssetCacheEnv): Promise<Response>;
};

export default worker;

export function errorPage(request: Request, env: AssetCacheEnv, status: number): Promise<Response>;

export interface AppleAppLinkComponent {
  "/": string;
  comment?: string;
  exclude?: boolean;
}

export function appleAppSiteAssociation(
  appIDs: string[],
  components: AppleAppLinkComponent[],
): string;
