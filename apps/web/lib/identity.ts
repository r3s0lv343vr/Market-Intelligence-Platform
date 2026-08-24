/**
 * Ingest identity for Trace Market Intelligence.
 * Locked in code so a generic library User-Agent cannot be sent by accident.
 * This string is for ingest jobs only — never for browser traffic to EDGAR.
 */
export const PLATFORM_NAME = "Trace Market Intelligence";
export const AGENT_TOKEN = "TraceMI/0.1";
export const CONTACT_EMAIL = "tracemarketintelligence@gmail.com";

export const USER_AGENT = `${AGENT_TOKEN} (${PLATFORM_NAME}; ${CONTACT_EMAIL})`;

/** Target below the SEC 10 req/s ceiling. Bursting to the cap is how identities get blocked. */
export const SEC_TARGET_RPS = 5;
export const SEC_HARD_CAP_RPS = 8;

export const INGEST_ENABLE_ENV = "TRACE_INGEST_ENABLED";
export const INGEST_CONFIRM_ENV = "TRACE_INGEST_CONFIRM";

export function identityPublic() {
  return {
    platformName: PLATFORM_NAME,
    agentToken: AGENT_TOKEN,
    contactEmail: CONTACT_EMAIL,
    userAgent: USER_AGENT,
    secTargetRps: SEC_TARGET_RPS,
    secHardCapRps: SEC_HARD_CAP_RPS,
  };
}
