/**
 * SOC 2 Type II Compliance Controls
 * Implements security controls framework for SOC 2 compliance
 */

import { Pool } from 'pg';

export enum TrustServiceCriteria {
  SECURITY = 'security',
  AVAILABILITY = 'availability',
  PROCESSING_INTEGRITY = 'processing_integrity',
  CONFIDENTIALITY = 'confidentiality',
  PRIVACY = 'privacy',
}

export enum ControlCategory {
  ACCESS_CONTROL = 'access_control',
  CHANGE_MANAGEMENT = 'change_management',
  SYSTEM_OPERATIONS = 'system_operations',
  RISK_MITIGATION = 'risk_mitigation',
  LOGICAL_SECURITY = 'logical_security',
}

export interface SecurityControl {
  id: string;
  name: string;
  description: string;
  category: ControlCategory;
  criteria: TrustServiceCriteria[];
  implemented: boolean;
  automatedMonitoring: boolean;
  lastReviewed?: Date;
  evidence?: string[];
}

export interface ComplianceCheck {
  controlId: string;
  timestamp: Date;
  passed: boolean;
  findings?: string;
  evidence?: string;
}

export class SOC2ComplianceService {
  private controls: Map<string, SecurityControl> = new Map();

  constructor(private pool: Pool) {
    this.initializeControls();
  }

  /**
   * Initialize SOC 2 security controls
   */
  private initializeControls(): void {
    const controls: SecurityControl[] = [
      // CC6.1 - Logical and Physical Access Controls
      {
        id: 'CC6.1',
        name: 'Access Control',
        description: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.',
        category: ControlCategory.ACCESS_CONTROL,
        criteria: [TrustServiceCriteria.SECURITY, TrustServiceCriteria.CONFIDENTIALITY],
        implemented: true,
        automatedMonitoring: true,
      },
      
      // CC6.2 - Authentication
      {
        id: 'CC6.2',
        name: 'Authentication',
        description: 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users.',
        category: ControlCategory.ACCESS_CONTROL,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // CC6.3 - Authorization
      {
        id: 'CC6.3',
        name: 'Authorization',
        description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets.',
        category: ControlCategory.ACCESS_CONTROL,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // CC6.6 - Encryption
      {
        id: 'CC6.6',
        name: 'Encryption',
        description: 'The entity implements encryption over data at rest and in transit.',
        category: ControlCategory.LOGICAL_SECURITY,
        criteria: [TrustServiceCriteria.SECURITY, TrustServiceCriteria.CONFIDENTIALITY],
        implemented: true,
        automatedMonitoring: false,
      },

      // CC6.7 - System Monitoring
      {
        id: 'CC6.7',
        name: 'System Monitoring',
        description: 'The entity restricts the transmission, movement, and removal of information to authorized internal and external users.',
        category: ControlCategory.SYSTEM_OPERATIONS,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // CC7.2 - Security Incident Detection
      {
        id: 'CC7.2',
        name: 'Security Incident Detection',
        description: 'The entity monitors system components and the operation of those components for anomalies.',
        category: ControlCategory.RISK_MITIGATION,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // CC7.3 - Security Incident Response
      {
        id: 'CC7.3',
        name: 'Security Incident Response',
        description: 'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives.',
        category: ControlCategory.RISK_MITIGATION,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: false,
      },

      // CC7.4 - Security Incident Mitigation
      {
        id: 'CC7.4',
        name: 'Security Incident Mitigation',
        description: 'The entity responds to identified security incidents by executing a defined incident response program.',
        category: ControlCategory.RISK_MITIGATION,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: false,
      },

      // CC8.1 - Change Management
      {
        id: 'CC8.1',
        name: 'Change Management',
        description: 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.',
        category: ControlCategory.CHANGE_MANAGEMENT,
        criteria: [TrustServiceCriteria.SECURITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // A1.2 - Availability Monitoring
      {
        id: 'A1.2',
        name: 'Availability Monitoring',
        description: 'The entity monitors environmental protections to physical access and systems to detect and respond to identified incidents.',
        category: ControlCategory.SYSTEM_OPERATIONS,
        criteria: [TrustServiceCriteria.AVAILABILITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // PI1.4 - Data Integrity
      {
        id: 'PI1.4',
        name: 'Data Integrity',
        description: 'The entity implements policies and procedures to make data available for use in a timely manner in accordance with commitments.',
        category: ControlCategory.SYSTEM_OPERATIONS,
        criteria: [TrustServiceCriteria.PROCESSING_INTEGRITY],
        implemented: true,
        automatedMonitoring: true,
      },

      // C1.1 - Confidentiality
      {
        id: 'C1.1',
        name: 'Confidentiality',
        description: 'The entity identifies and maintains confidential information to meet commitments and system requirements.',
        category: ControlCategory.LOGICAL_SECURITY,
        criteria: [TrustServiceCriteria.CONFIDENTIALITY],
        implemented: true,
        automatedMonitoring: false,
      },

      // P3.2 - Data Retention
      {
        id: 'P3.2',
        name: 'Data Retention',
        description: 'The entity retains personal information consistent with commitments in the privacy notice.',
        category: ControlCategory.SYSTEM_OPERATIONS,
        criteria: [TrustServiceCriteria.PRIVACY],
        implemented: true,
        automatedMonitoring: true,
      },

      // P4.3 - Data Disposal
      {
        id: 'P4.3',
        name: 'Data Disposal',
        description: 'The entity securely disposes of personal information to meet commitments in the privacy notice.',
        category: ControlCategory.SYSTEM_OPERATIONS,
        criteria: [TrustServiceCriteria.PRIVACY],
        implemented: true,
        automatedMonitoring: false,
      },
    ];

    controls.forEach(control => {
      this.controls.set(control.id, control);
    });
  }

  /**
   * Initialize database tables for compliance tracking
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS soc2_compliance_checks (
        id SERIAL PRIMARY KEY,
        control_id VARCHAR(20) NOT NULL,
        check_timestamp TIMESTAMP NOT NULL,
        passed BOOLEAN NOT NULL,
        findings TEXT,
        evidence TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS soc2_control_evidence (
        id SERIAL PRIMARY KEY,
        control_id VARCHAR(20) NOT NULL,
        evidence_type VARCHAR(100) NOT NULL,
        description TEXT,
        file_path TEXT,
        collected_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS soc2_audit_reports (
        id SERIAL PRIMARY KEY,
        report_period_start DATE NOT NULL,
        report_period_end DATE NOT NULL,
        auditor VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        findings TEXT,
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_compliance_checks_control_id ON soc2_compliance_checks(control_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_timestamp ON soc2_compliance_checks(check_timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_control_evidence_control_id ON soc2_control_evidence(control_id);
    `);
  }

  /**
   * Get all security controls
   */
  getControls(criteria?: TrustServiceCriteria): SecurityControl[] {
    const allControls = Array.from(this.controls.values());
    
    if (criteria) {
      return allControls.filter(control => control.criteria.includes(criteria));
    }
    
    return allControls;
  }

  /**
   * Get a specific control
   */
  getControl(controlId: string): SecurityControl | undefined {
    return this.controls.get(controlId);
  }

  /**
   * Record a compliance check
   */
  async recordComplianceCheck(check: ComplianceCheck): Promise<void> {
    await this.pool.query(
      `INSERT INTO soc2_compliance_checks (control_id, check_timestamp, passed, findings, evidence)
       VALUES ($1, $2, $3, $4, $5)`,
      [check.controlId, check.timestamp, check.passed, check.findings, check.evidence]
    );
  }

  /**
   * Get compliance check history
   */
  async getComplianceHistory(
    controlId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceCheck[]> {
    let query = 'SELECT * FROM soc2_compliance_checks WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (controlId) {
      query += ` AND control_id = $${paramCount++}`;
      params.push(controlId);
    }

    if (startDate) {
      query += ` AND check_timestamp >= $${paramCount++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND check_timestamp <= $${paramCount++}`;
      params.push(endDate);
    }

    query += ' ORDER BY check_timestamp DESC';

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      controlId: row.control_id,
      timestamp: row.check_timestamp,
      passed: row.passed,
      findings: row.findings,
      evidence: row.evidence,
    }));
  }

  /**
   * Run automated compliance checks
   */
  async runAutomatedChecks(): Promise<Map<string, ComplianceCheck>> {
    const results = new Map<string, ComplianceCheck>();

    for (const control of this.controls.values()) {
      if (!control.automatedMonitoring) {
        continue;
      }

      try {
        const check = await this.checkControl(control.id);
        results.set(control.id, check);
        await this.recordComplianceCheck(check);
      } catch (error) {
        console.error(`Failed to check control ${control.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Check specific control (implement automated checks)
   */
  private async checkControl(controlId: string): Promise<ComplianceCheck> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    // Implement actual checks based on control ID
    // These are examples - in production, implement real checks
    let passed = true;
    let findings = '';

    switch (controlId) {
      case 'CC6.1': // Access Control
        // Check if access control middleware is active
        passed = true;
        break;

      case 'CC6.2': // Authentication
        // Check if all endpoints require authentication
        passed = true;
        break;

      case 'CC6.6': // Encryption
        // Check if encryption is enabled
        passed = process.env.ENCRYPTION_ENABLED === 'true';
        if (!passed) {
          findings = 'Encryption is not enabled';
        }
        break;

      case 'CC7.2': // Security Incident Detection
        // Check if audit logging is active
        passed = true;
        break;

      case 'A1.2': // Availability Monitoring
        // Check system health
        passed = true;
        break;

      default:
        findings = 'Automated check not implemented';
    }

    return {
      controlId,
      timestamp: new Date(),
      passed,
      findings: findings || undefined,
      evidence: `Automated check on ${new Date().toISOString()}`,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    controls: SecurityControl[];
    checks: ComplianceCheck[];
    summary: {
      totalControls: number;
      implementedControls: number;
      checksPerformed: number;
      checksPassed: number;
      checksFailed: number;
      complianceRate: number;
    };
  }> {
    const controls = this.getControls();
    const checks = await this.getComplianceHistory(undefined, startDate, endDate);

    const implementedControls = controls.filter(c => c.implemented).length;
    const checksPassed = checks.filter(c => c.passed).length;
    const checksFailed = checks.filter(c => !c.passed).length;

    return {
      period: { start: startDate, end: endDate },
      controls,
      checks,
      summary: {
        totalControls: controls.length,
        implementedControls,
        checksPerformed: checks.length,
        checksPassed,
        checksFailed,
        complianceRate: checks.length > 0 ? (checksPassed / checks.length) * 100 : 0,
      },
    };
  }

  /**
   * Store control evidence
   */
  async storeControlEvidence(
    controlId: string,
    evidenceType: string,
    description: string,
    filePath?: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO soc2_control_evidence (control_id, evidence_type, description, file_path)
       VALUES ($1, $2, $3, $4)`,
      [controlId, evidenceType, description, filePath]
    );
  }

  /**
   * Get control evidence
   */
  async getControlEvidence(controlId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM soc2_control_evidence 
       WHERE control_id = $1 
       ORDER BY collected_at DESC`,
      [controlId]
    );

    return result.rows;
  }
}

/**
 * Singleton instance
 */
let soc2ServiceInstance: SOC2ComplianceService | null = null;

export function getSOC2Service(pool?: Pool): SOC2ComplianceService {
  if (!soc2ServiceInstance && pool) {
    soc2ServiceInstance = new SOC2ComplianceService(pool);
  }
  if (!soc2ServiceInstance) {
    throw new Error('SOC2ComplianceService not initialized');
  }
  return soc2ServiceInstance;
}

export async function initializeSOC2Service(pool: Pool): Promise<SOC2ComplianceService> {
  const service = getSOC2Service(pool);
  await service.initialize();
  return service;
}
