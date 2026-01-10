# ThinkCNAP - Kubernetes Deployment Guide

Helm chart for deploying ThinkCNAP application to Kubernetes with PostgreSQL database.

## Quick Start

### Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.0+
- `kubectl` configured
- Persistent volume support

### Installation

1. **Set database password** (REQUIRED):
   ```bash
   # Option 1: Set in values file
   cat > my-values.yaml <<EOF
   database:
     password: "your-secure-password-here"
   EOF
   
   # Option 2: Use Kubernetes secret (recommended)
   kubectl create secret generic think-cnap-db-secret \
     --from-literal=password='your-secure-password' \
     --namespace think-cnap
   
   cat > my-values.yaml <<EOF
   database:
     existingSecret: "think-cnap-db-secret"
   EOF
   ```

2. **Install the chart:**
   ```bash
   # From local chart
   helm install my-think-cnap ./charts \
     --namespace think-cnap \
     --create-namespace \
     -f my-values.yaml
   
   # Or from Helm repository
   helm repo add think-cnap https://aliaksxssv.github.io/think-cnap
   helm repo update
   helm install my-think-cnap think-cnap/think-cnap \
     --namespace think-cnap \
     --create-namespace \
     -f my-values.yaml
   ```

3. **Access the application:**
   ```bash
   kubectl port-forward svc/my-think-cnap 8080:80 -n think-cnap
   # Open http://localhost:8080
   ```

## Architecture

Single pod with two containers:
- **App Container**: Web application (port 8080)
- **Database Container**: PostgreSQL 16 with automatic migrations and seed data

Shared persistent volume (500Mi default) for database storage.

## Configuration

### Required Settings

**Database Password** (MUST be set):
```yaml
database:
  password: "your-secure-password"  # Development
  # OR
  existingSecret: "my-db-secret"     # Production (recommended)
```

### Key Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `database.password` | PostgreSQL password | **REQUIRED** |
| `database.existingSecret` | Use existing Kubernetes secret | - |
| `persistence.size` | Database storage size | `500Mi` |
| `service.type` | Service type | `ClusterIP` |
| `image.tag` | App image tag | `latest` |

### Production Values Example

```yaml
# my-values.yaml
database:
  existingSecret: "think-cnap-db-secret"

persistence:
  size: 1Gi
  storageClass: "fast-ssd"

service:
  type: LoadBalancer

networkPolicy:
  enabled: true  # Enable for production

resources:
  app:
    limits:
      cpu: 1000m
      memory: 1Gi
  database:
    limits:
      cpu: 500m
      memory: 512Mi
```

## Database

The database container automatically:
1. Runs migrations from `sql/migrations/`
2. Seeds reference data from `sql/seed-data/` (domains, controls, measures, default scoring)
3. Excludes user data - only reference data is seeded

## Security

### Default Security Settings

- Non-root users (App: UID 1000, Database: UID 999)
- No privilege escalation
- All Linux capabilities dropped
- Seccomp profiles enabled
- **No default password** (must be set)

### Production Checklist

- [ ] Set secure database password
- [ ] Use Kubernetes secrets for passwords
- [ ] Enable network policies (`networkPolicy.enabled: true`)
- [ ] Review resource limits
- [ ] Use private container registry
- [ ] Enable monitoring and alerting

## Troubleshooting

### Pod Stuck in Pending
```bash
kubectl describe pvc -n think-cnap
kubectl get storageclass
```

### Database Not Initialized
```bash
kubectl logs <pod-name> -c database -n think-cnap
```

### Application Not Reachable
```bash
kubectl get svc -n think-cnap
kubectl port-forward svc/my-think-cnap 8080:80 -n think-cnap
```

### Access Database
```bash
POD=$(kubectl get pod -l app.kubernetes.io/name=think-cnap -n think-cnap -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD -c database -n think-cnap -- psql -U thinkcnap -d thinkcnap
```

## Updating Seed Data

To update database seed data from production:

```bash
# Prerequisites
npm install -g wrangler
wrangler login
brew install jq  # or apt-get install jq

# Export from Cloudflare D1
./scripts/produce-seed-data.sh ./sql/seed-data

# Review and commit
git add sql/seed-data/*.sql
git commit -m "Update database seed data"
```

**Exported data:**
- ✅ Security domains, controls, action items
- ✅ Default scoring (all set to -1, -1, -1)
- ✅ MITRE TTPs and relationships
- ❌ No user data, credentials, or custom assessments

## Directory Structure

```
think-cnap/
├── charts/          # Helm chart
├── docker/          # Dockerfiles
├── sql/             # Migrations and seed data
├── scripts/         # Utility scripts
└── README.md        # This file
```

## License

MIT License
