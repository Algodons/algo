/**
 * SAML 2.0 Authentication Implementation
 * Supports SSO integration with Okta and Azure AD
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { URL } from 'url';

export interface SAMLConfig {
  entryPoint: string; // IdP SSO URL
  issuer: string; // SP Entity ID
  callbackUrl: string; // Assertion Consumer Service URL
  cert: string; // IdP certificate for signature validation
  privateKey?: string; // SP private key for signing requests
  identifierFormat?: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  provider?: 'okta' | 'azure' | 'generic';
}

export interface SAMLProfile {
  nameID: string;
  nameIDFormat: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  attributes: Record<string, any>;
}

export class SAMLAuth {
  private config: SAMLConfig;

  constructor(config: SAMLConfig) {
    this.config = {
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      ...config,
    };
  }

  /**
   * Generate SAML authentication request
   */
  generateAuthRequest(relayState?: string): { url: string; requestId: string } {
    const requestId = '_' + crypto.randomBytes(16).toString('hex');
    const issueInstant = new Date().toISOString();

    const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest 
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${this.config.entryPoint}"
  AssertionConsumerServiceURL="${this.config.callbackUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.config.issuer}</saml:Issuer>
  <samlp:NameIDPolicy 
    Format="${this.config.identifierFormat}"
    AllowCreate="true"/>
</samlp:AuthnRequest>`;

    // Base64 encode and deflate the request
    const encoded = Buffer.from(samlRequest, 'utf8').toString('base64');

    // Build redirect URL
    const url = new URL(this.config.entryPoint);
    url.searchParams.append('SAMLRequest', encoded);
    if (relayState) {
      url.searchParams.append('RelayState', relayState);
    }

    return {
      url: url.toString(),
      requestId,
    };
  }

  /**
   * Validate SAML response
   */
  async validateResponse(samlResponse: string): Promise<SAMLProfile> {
    // Decode base64 response
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf8');

    // Parse SAML response (simplified - in production use a proper XML parser)
    const profile = this.parseSAMLResponse(decoded);

    // Validate signature (simplified - in production implement proper signature validation)
    if (!this.validateSignature(decoded)) {
      throw new Error('Invalid SAML signature');
    }

    return profile;
  }

  /**
   * Parse SAML response XML
   * 
   * WARNING: This is a simplified parser for demonstration purposes.
   * In production, you MUST use a proper XML parser with security features:
   * - Use xml2js, xmldom, or fast-xml-parser
   * - Disable external entities (XXE protection)
   * - Validate XML structure
   * - Use schema validation
   * 
   * Example production implementation:
   * ```
   * import { parseStringPromise } from 'xml2js';
   * const result = await parseStringPromise(xml, {
   *   explicitArray: false,
   *   ignoreAttrs: false,
   *   tagNameProcessors: [stripPrefix],
   *   // Disable external entities for XXE protection
   *   xmlns: false,
   * });
   * ```
   */
  private parseSAMLResponse(xml: string): SAMLProfile {
    // TODO: Replace with proper XML parser (xml2js, xmldom, fast-xml-parser)
    // This implementation is vulnerable to XML injection and XXE attacks
    
    // Extract NameID
    const nameIDMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const nameID = nameIDMatch ? nameIDMatch[1] : '';

    // Extract NameID format
    const formatMatch = xml.match(/<saml:NameID[^>]*Format="([^"]+)"/);
    const nameIDFormat = formatMatch ? formatMatch[1] : this.config.identifierFormat || '';

    // Extract attributes
    const attributes: Record<string, any> = {};
    const attributeRegex = /<saml:Attribute Name="([^"]+)"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gs;
    let match;
    
    while ((match = attributeRegex.exec(xml)) !== null) {
      const [, name, value] = match;
      attributes[name] = value;
    }

    // Map common attributes based on provider
    let email = attributes.email || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    let firstName = attributes.firstName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
    let lastName = attributes.lastName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
    let displayName = attributes.displayName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];

    // Provider-specific attribute mapping
    if (this.config.provider === 'okta') {
      email = email || attributes['email'];
      firstName = firstName || attributes['firstName'];
      lastName = lastName || attributes['lastName'];
    } else if (this.config.provider === 'azure') {
      email = email || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      firstName = firstName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
      lastName = lastName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
    }

    return {
      nameID,
      nameIDFormat,
      email,
      firstName,
      lastName,
      displayName,
      attributes,
    };
  }

  /**
   * Validate SAML signature
   * 
   * CRITICAL SECURITY WARNING: This is a placeholder implementation.
   * It DOES NOT provide real security and MUST be replaced in production.
   * 
   * In production, you MUST:
   * 1. Use a battle-tested SAML library (passport-saml, @node-saml/node-saml)
   * 2. Cryptographically verify the XML signature using the IdP certificate
   * 3. Validate signature algorithm and digest method
   * 4. Check certificate validity and expiration
   * 5. Verify the signature covers the Assertion or Response
   * 
   * Example production implementation:
   * ```
   * import { validateXmlSignature } from '@node-saml/node-saml';
   * const isValid = validateXmlSignature(xml, this.config.cert);
   * if (!isValid) throw new Error('Invalid SAML signature');
   * ```
   * 
   * DO NOT USE THIS CODE IN PRODUCTION - It will accept forged SAML responses!
   */
  private validateSignature(xml: string): boolean {
    // TODO: Implement proper XML signature validation using @node-saml/node-saml or similar
    // This placeholder only checks for signature presence, NOT validity
    console.warn('WARNING: Using placeholder SAML signature validation. Replace with proper validation in production!');
    return xml.includes('<ds:Signature') || xml.includes('<Signature');
  }

  /**
   * Generate metadata XML for SP
   */
  generateMetadata(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor 
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${this.config.issuer}">
  <md:SPSSODescriptor 
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>${this.config.identifierFormat}</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${this.config.callbackUrl}"
      index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }
}

/**
 * Express middleware for SAML authentication
 */
export function samlAuth(config: SAMLConfig) {
  const saml = new SAMLAuth(config);

  return {
    /**
     * Initiate SAML login
     */
    login: (req: Request, res: Response) => {
      const relayState = req.query.returnTo as string || '/';
      const { url, requestId } = saml.generateAuthRequest(relayState);
      
      // Store request ID in session for validation
      if (req.session) {
        (req.session as any).samlRequestId = requestId;
      }

      res.redirect(url);
    },

    /**
     * Handle SAML callback
     */
    callback: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const samlResponse = req.body.SAMLResponse;
        const relayState = req.body.RelayState || '/';

        if (!samlResponse) {
          return res.status(400).json({ error: 'Missing SAMLResponse' });
        }

        // Validate the SAML response
        const profile = await saml.validateResponse(samlResponse);

        // Attach profile to request for downstream processing
        (req as any).samlProfile = profile;

        // Redirect to relay state or default
        if (req.query.json) {
          res.json({ profile });
        } else {
          res.redirect(relayState);
        }
      } catch (error) {
        console.error('SAML authentication error:', error);
        res.status(401).json({ 
          error: 'SAML authentication failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },

    /**
     * Metadata endpoint
     */
    metadata: (req: Request, res: Response) => {
      res.type('application/xml');
      res.send(saml.generateMetadata());
    },
  };
}

/**
 * Create SAML configuration for Okta
 */
export function createOktaConfig(options: {
  oktaDomain: string;
  appId: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
}): SAMLConfig {
  return {
    provider: 'okta',
    entryPoint: `https://${options.oktaDomain}/app/${options.appId}/sso/saml`,
    issuer: options.issuer,
    callbackUrl: options.callbackUrl,
    cert: options.cert,
  };
}

/**
 * Create SAML configuration for Azure AD
 */
export function createAzureADConfig(options: {
  tenantId: string;
  issuer: string;
  callbackUrl: string;
  cert: string;
}): SAMLConfig {
  return {
    provider: 'azure',
    entryPoint: `https://login.microsoftonline.com/${options.tenantId}/saml2`,
    issuer: options.issuer,
    callbackUrl: options.callbackUrl,
    cert: options.cert,
  };
}
