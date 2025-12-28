// LDAP service removed. LDAP authentication has been deprecated in this codebase.
// Keeping this stub to avoid breaking imports; it returns null for all calls.

export interface LDAPUser {
  email: string;
  displayName?: string;
  dn: string;
}

export async function authenticateWithLDAP(_email: string, _password: string): Promise<LDAPUser | null> {
  // LDAP removed — return null so callers fall back to other auth flows.
  return null;
}