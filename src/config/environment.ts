import Constants from 'expo-constants';

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

function expoDevelopmentHost() {
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string; hostUri?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };
  const hostUri = Constants.expoConfig?.hostUri || constants.manifest?.debuggerHost ||
    constants.manifest?.hostUri || constants.manifest2?.extra?.expoClient?.hostUri;
  return hostUri?.split(':')[0];
}

function resolveApiBaseUrl() {
  // A deployed HTTPS API must never be rewritten. Local development URLs use
  // the Expo/Metro host, which changes automatically when the Wi-Fi changes.
  if (!__DEV__ || configuredApiBaseUrl.startsWith('https://')) return configuredApiBaseUrl;
  try {
    const configured = new URL(configuredApiBaseUrl);
    const host = expoDevelopmentHost();
    if (host) configured.hostname = host;
    return configured.toString().replace(/\/$/, '');
  } catch {
    return configuredApiBaseUrl;
  }
}

export const environment = {
  configuredApiBaseUrl,
  apiBaseUrl: resolveApiBaseUrl(),
  tenantId: process.env.EXPO_PUBLIC_TENANT_ID ?? '',
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',
  requestTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 30_000),
  // API base only. Authentication and document creation belong on the server;
  // the mobile app opens the public direct-link URL returned per form.
  pdfSignerApiBaseUrl: process.env.EXPO_PUBLIC_PDF_SIGNER_URL ?? '',
} as const;
