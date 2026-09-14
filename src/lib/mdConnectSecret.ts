export function mdConnectIntegrationSecret() {
  return process.env.MD_CONNECT_INTEGRATION_SECRET || process.env.VANE_INTEGRATION_SECRET || '';
}
