import * as ldap from 'ldapjs';
import { promisify } from 'util';

const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:389';
const LDAP_BIND_DN = process.env.LDAP_BIND_DN || '';
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD || '';
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || '';
const LDAP_ENABLED = process.env.LDAP_ENABLED === 'true' && LDAP_BIND_DN && LDAP_BIND_PASSWORD && LDAP_BASE_DN;
const LDAP_USER_FILTER = '(mail={email})'; // Adjust filter based on your LDAP schema

interface LDAPUser {
  email: string;
  displayName?: string;
  dn: string;
}

export async function authenticateWithLDAP(email: string, password: string): Promise<LDAPUser | null> {
  // Check if LDAP is enabled
  if (!LDAP_ENABLED) {
    console.warn('[LDAP] LDAP is not configured. Please set LDAP_ENABLED=true and configure LDAP env variables.');
    return null;
  }

  const client = ldap.createClient({
    url: LDAP_URL,
    tlsOptions: { rejectUnauthorized: false } // In production, set proper TLS options
  });

  const bindAsync = promisify(client.bind).bind(client);

  try {
    console.log(`[LDAP] Attempting to connect to ${LDAP_URL}`);
    console.log(`[LDAP] Binding with DN: ${LDAP_BIND_DN}`);

    // First bind with service account
    await bindAsync(LDAP_BIND_DN, LDAP_BIND_PASSWORD);

    // Search for user
    const searchOptions: ldap.SearchOptions = {
      scope: 'sub',
      filter: LDAP_USER_FILTER.replace('{email}', email),
      attributes: ['dn', 'mail', 'displayName']
    };

    console.log(`[LDAP] Searching for user with email: ${email}`);
    console.log(`[LDAP] Search filter: ${searchOptions.filter}`);

    let user: LDAPUser | null = null;

    // Use callback-style search wrapped in a Promise to properly handle ldapjs event emitter
    await new Promise<void>((resolve, reject) => {
      client.search(LDAP_BASE_DN, searchOptions, (err, res) => {
        if (err) return reject(err);

        res.on('searchEntry', (entry: any) => {
          user = {
            email: entry.object.mail,
            displayName: entry.object.displayName,
            dn: entry.object.dn
          };
          console.log(`[LDAP] User found: ${user.email}`);
        });

        res.on('error', (err) => reject(err));
        res.on('end', () => resolve());
      });
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Try to bind with user credentials to verify password
    const userClient = ldap.createClient({
      url: LDAP_URL,
      tlsOptions: { rejectUnauthorized: false }
    });

    try {
      // user is guaranteed to be non-null here (checked above)
      await promisify(userClient.bind).bind(userClient)((user as any).dn, password);
      console.log(`[LDAP] Authentication successful for ${email}`);
      return user;
    } catch (error) {
      console.error('LDAP authentication failed:', error);
      return null;
    } finally {
      userClient.unbind();
    }
  } catch (error) {
    console.error('LDAP error:', error);
    return null;
  } finally {
    client.unbind();
  }
}