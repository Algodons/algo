import { FrameworkInfo } from '../auto-detect/framework-detector';
import { PortConfiguration } from '../auto-detect/port-detector';

export interface KubernetesManifests {
  deployment: string;
  service: string;
  ingress?: string;
  configMap?: string;
  hpa?: string;
}

/**
 * Generate Kubernetes manifests for deployment
 */
export class KubernetesGenerator {
  /**
   * Generate all Kubernetes manifests
   */
  generateManifests(
    appName: string,
    frameworks: FrameworkInfo[],
    ports: PortConfiguration[],
    domain?: string
  ): KubernetesManifests {
    const port = ports[0]?.port || 3000;

    return {
      deployment: this.generateDeployment(appName, port),
      service: this.generateService(appName, port),
      ingress: domain ? this.generateIngress(appName, domain, port) : undefined,
      configMap: this.generateConfigMap(appName),
      hpa: this.generateHPA(appName),
    };
  }

  /**
   * Generate Deployment manifest
   */
  private generateDeployment(appName: string, port: number): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  labels:
    app: ${appName}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${appName}:latest
        imagePullPolicy: Always
        ports:
        - containerPort: ${port}
          name: http
        env:
        - name: PORT
          value: "${port}"
        - name: NODE_ENV
          value: "production"
        envFrom:
        - configMapRef:
            name: ${appName}-config
        - secretRef:
            name: ${appName}-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: ${port}
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      restartPolicy: Always
`;
  }

  /**
   * Generate Service manifest
   */
  private generateService(appName: string, port: number): string {
    return `apiVersion: v1
kind: Service
metadata:
  name: ${appName}
  labels:
    app: ${appName}
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: ${port}
    protocol: TCP
    name: http
  selector:
    app: ${appName}
`;
  }

  /**
   * Generate Ingress manifest
   */
  private generateIngress(appName: string, domain: string, port: number): string {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appName}
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ${domain}
    secretName: ${appName}-tls
  rules:
  - host: ${domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${appName}
            port:
              number: 80
`;
  }

  /**
   * Generate ConfigMap manifest
   */
  private generateConfigMap(appName: string): string {
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
data:
  # Add your configuration here
  LOG_LEVEL: "info"
  API_TIMEOUT: "30000"
`;
  }

  /**
   * Generate HorizontalPodAutoscaler manifest
   */
  private generateHPA(appName: string): string {
    return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${appName}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${appName}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
`;
  }

  /**
   * Generate Secret template (values should be base64 encoded)
   */
  generateSecretTemplate(appName: string): string {
    return `apiVersion: v1
kind: Secret
metadata:
  name: ${appName}-secrets
type: Opaque
data:
  # Base64 encoded values
  # DATABASE_URL: <base64-encoded-value>
  # API_KEY: <base64-encoded-value>
`;
  }

  /**
   * Generate PersistentVolumeClaim for stateful apps
   */
  generatePVC(appName: string, size: string = '10Gi'): string {
    return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${appName}-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${size}
  storageClassName: standard
`;
  }
}
