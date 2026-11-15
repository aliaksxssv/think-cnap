-- Catalog update (November 2026): new Kubernetes measures and refreshed measure texts
-- Safe on fresh installs (no controls yet -> nothing inserted; seed data already current)
-- and on re-run. Text updates only apply where the text is still the previous default,
-- so edits made through the admin panel are preserved.

-- New measures
INSERT INTO action_items (control_id, measure_id, measure, comment, tags)
SELECT id, 'SEC01-BP02-K8S-001', 'MITIGATION: Restrict cluster-admin and the system:masters group', 'The Kubernetes analogue of the AWS root user is the cluster-admin ClusterRole and the built-in system:masters group. system:masters bypasses RBAC and every admission webhook, and cannot be revoked without reissuing the cluster CA.

Never issue client certificates with O=system:masters. Keep that path for break-glass only, held offline and tested on a schedule. Bind cluster-admin to named human identities through the IdP.', 'kubernetes'
FROM security_controls WHERE code = 'SEC01-BP02'
ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
SELECT 'SEC01-BP02-K8S-001', NULL, 'high', 'low', -1, -1, -1, 1
WHERE EXISTS (SELECT 1 FROM action_items WHERE measure_id = 'SEC01-BP02-K8S-001')
  AND NOT EXISTS (SELECT 1 FROM scoring WHERE measure_id = 'SEC01-BP02-K8S-001' AND is_default = 1);

INSERT INTO action_items (control_id, measure_id, measure, comment, tags)
SELECT id, 'SEC01-BP04-K8S-001', 'DETECTION: Track upstream Kubernetes CVEs and version end-of-life', 'Kubernetes supports only the three most recent minor versions, roughly 14 months. An unsupported cluster stops receiving patches for CVEs that are still being published against it, so version currency is a security control rather than maintenance.

Subscribe to kubernetes-announce and the official CVE feed, and track the end-of-life date of every cluster''s minor version and of any provider extended-support window.', 'kubernetes'
FROM security_controls WHERE code = 'SEC01-BP04'
ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
SELECT 'SEC01-BP04-K8S-001', NULL, 'high', 'medium', -1, -1, -1, 1
WHERE EXISTS (SELECT 1 FROM action_items WHERE measure_id = 'SEC01-BP04-K8S-001')
  AND NOT EXISTS (SELECT 1 FROM scoring WHERE measure_id = 'SEC01-BP04-K8S-001' AND is_default = 1);

INSERT INTO action_items (control_id, measure_id, measure, comment, tags)
SELECT id, 'SEC01-BP06-K8S-001', 'MITIGATION: Enforce standard controls as policy-as-code admission rules', 'The Kubernetes equivalent of auto-enable is admission control. A policy evaluated on every apply covers workloads that do not exist yet, which is the only way coverage stays at 100% as teams add namespaces and deployments.

Use Kyverno, OPA Gatekeeper or the built-in ValidatingAdmissionPolicy to enforce the baseline: no privileged containers or host namespaces, resource limits present, images from allowlisted registries. Ship the policies themselves through GitOps so the control set is reviewable and reproducible rather than applied by hand.

Start every policy in Audit, measure the violation rate, then switch to Enforce. A policy that blocks deployments the day it ships gets an exclusion carved around it and is never tightened again.', 'kubernetes'
FROM security_controls WHERE code = 'SEC01-BP06'
ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
SELECT 'SEC01-BP06-K8S-001', NULL, 'high', 'medium', -1, -1, -1, 1
WHERE EXISTS (SELECT 1 FROM action_items WHERE measure_id = 'SEC01-BP06-K8S-001')
  AND NOT EXISTS (SELECT 1 FROM scoring WHERE measure_id = 'SEC01-BP06-K8S-001' AND is_default = 1);

INSERT INTO action_items (control_id, measure_id, measure, comment, tags)
SELECT id, 'SEC01-BP07-K8S-001', 'MITIGATION: Threat model the cluster attack surface', 'Apply the threat modelling process to the cluster itself, not only to the workloads on it. The system under review is the API server, the kubelet, the container runtime, the image supply chain, and the identity binding between a workload and the cloud account behind it.

Walk a concrete chain rather than brainstorming: code execution in a pod, escalation via a permissive ServiceAccount or hostPath mount, lateral movement across the pod network, escape to the node, then cloud credentials from node metadata. The MITRE ATT&CK Containers matrix works as the catalog for the "what can go wrong" step.', 'kubernetes'
FROM security_controls WHERE code = 'SEC01-BP07'
ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
SELECT 'SEC01-BP07-K8S-001', NULL, 'high', 'medium', -1, -1, -1, 1
WHERE EXISTS (SELECT 1 FROM action_items WHERE measure_id = 'SEC01-BP07-K8S-001')
  AND NOT EXISTS (SELECT 1 FROM scoring WHERE measure_id = 'SEC01-BP07-K8S-001' AND is_default = 1);

INSERT INTO action_items (control_id, measure_id, measure, comment, tags)
SELECT id, 'SEC01-BP08-K8S-001', 'DETECTION: Evaluate new upstream security features each release', 'Kubernetes ships security features roughly every four months and most require explicit opt-in — upgrading does not turn them on. Reviewing each minor release is how the baseline improves instead of freezing at whatever was default when the cluster was built.

Worth evaluating if not yet adopted: Pod Security Admission in place of the removed PodSecurityPolicy, ValidatingAdmissionPolicy as a webhook-free policy path, user namespaces for workload isolation, seccomp-by-default, and bound projected ServiceAccount tokens in place of long-lived secrets.

Record a decision per feature: adopted, deferred, or rejected with a reason. So the evaluation is not repeated each cycle. ', 'kubernetes'
FROM security_controls WHERE code = 'SEC01-BP08'
ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
SELECT 'SEC01-BP08-K8S-001', NULL, 'high', 'low', -1, -1, -1, 1
WHERE EXISTS (SELECT 1 FROM action_items WHERE measure_id = 'SEC01-BP08-K8S-001')
  AND NOT EXISTS (SELECT 1 FROM scoring WHERE measure_id = 'SEC01-BP08-K8S-001' AND is_default = 1);

-- Updated measure texts
UPDATE action_items SET measure = 'MITIGATION: Use separate clusters where namespace isolation is insufficient'
WHERE measure_id = 'SEC01-BP01-K8S-001' AND measure = 'MITIGATION: Implement a multi-cluster Kubernetes environment';
UPDATE action_items SET comment = 'The default separation boundary in Kubernetes is the namespace. A separate cluster is the stronger boundary and by far the more expensive one: duplicated control planes, add-ons, upgrades, monitoring and access management, multiplied by every cluster you run. Treat it as a deliberate escalation, not the starting point.

Consider Kubernetes clusters separation by environment, team, workload type. 
'
WHERE measure_id = 'SEC01-BP01-K8S-001' AND comment = 'Separate Kubernetes clusters by environment, team, workload type. 
';
UPDATE action_items SET measure = 'MITIGATION: Separate prod and non-prod registries and control image promotion'
WHERE measure_id = 'SEC01-BP01-K8S-002' AND measure = 'MITIGATION: Deploy separate container registries for non-prod and prod environments';
UPDATE action_items SET comment = 'A single registry shared by every environment turns non-prod into a route into production. Push access in development pipelines is held broadly, and anyone holding it can publish an image — or overwrite a mutable tag — that production later pulls and runs.

Run separate registries, or at minimum separate repositories with distinct credentials. Grant push to CI identities only, give production clusters pull-only access, and promote by digest rather than tag, gated on a signature and a passing scan.

Harden the pull path too, or the separation is decorative: disable anonymous pull, use immutable tags, and enforce at admission that workloads may pull only from an allowlisted registry.'
WHERE measure_id = 'SEC01-BP01-K8S-002' AND comment = 'Global registry pose risk as attackers can use it for data exfiltration between environments.';
UPDATE action_items SET measure = 'MITIGATION: Isolate workloads with namespaces and namespace-scoped policy'
WHERE measure_id = 'SEC01-BP01-K8S-003' AND measure = 'MITIGATION: Isolate resources using Kubernetes namespaces';
UPDATE action_items SET comment = 'Namespaces are the default separation boundary in Kubernetes and should be the first mechanism you reach for.

A namespace on its own isolates almost nothing. By default every pod can reach every other pod in every namespace, and a ServiceAccount is constrained only where its permissions come from namespace-scoped Roles and RoleBindings rather than ClusterRoleBindings. The boundary exists only once policy is attached to it: a default-deny NetworkPolicy with explicit allows, RBAC granted per namespace, ResourceQuota and LimitRange to contain resource consumption, and a Pod Security Admission level set through the namespace label. Creating the namespace is the cheap half; attaching the policy is the control.'
WHERE measure_id = 'SEC01-BP01-K8S-003' AND comment = 'Isolating resources with Kubernetes namespaces is important because it enforces logical separation of workloads and limits the blast radius of any compromise. Namespaces let you apply RBAC, NetworkPolicies, ResourceQuotas, and LimitRanges per environment or team, preventing unauthorized cross-namespace access. This ensures tighter control over traffic, permissions, and resource consumption across the cluster.';
UPDATE action_items SET measure = 'MITIGATION: Isolate containers using cgroups and Linux namespaces'
WHERE measure_id = 'SEC01-BP01-K8S-004' AND measure = 'MITIGATION: Isolate containers using cgroups, Linux namespaces and chroot';
UPDATE action_items SET comment = 'Container isolation prevents them from accessing host resources directly. Containers must never share the host’s PID, mount, or network namespaces, as this would expose host processes, file systems, or sockets to the container. Using separate namespaces ensures strict process, filesystem, and network isolation, while cgroups limit CPU, memory, and I/O usage to contain potential compromise impact.'
WHERE measure_id = 'SEC01-BP01-K8S-004' AND comment = 'Isolating containers with cgroups, Linux namespaces, and chroot prevents them from accessing host resources directly. Containers must never share the host’s PID, mount, or network namespaces, as this would expose host processes, file systems, or sockets to the container. Using separate namespaces ensures strict process, filesystem, and network isolation, while cgroups limit CPU, memory, and I/O usage to contain potential compromise impact.';
UPDATE action_items SET measure = 'MITIGATION: Don''t use root user for business as usual tasks'
WHERE measure_id = 'SEC01-BP02-AWS-001' AND measure = 'MITIGATION: Dont use root user for business as usual tasks';
UPDATE action_items SET comment = 'Configure MFA for the root user. Don''t maintain any access and secret keys for the root user.

Enable centralized root access in IAM and delete root user credentials for the AWS  Organizations member accounts.'
WHERE measure_id = 'SEC01-BP02-AWS-001' AND comment = 'Configure MFA for the root user. Dont maintain any access and secret keys for the root user.

Enable centralized root access in IAM and delete root user credentials for the AWS  Organizations member accounts.';
UPDATE action_items SET measure = 'MITIGATION: Use a managed Kubernetes service to reduce security scope'
WHERE measure_id = 'SEC01-BP05-K8S-001' AND measure = 'MITIGATION: Use AWS EKS to reduce security scope';
UPDATE action_items SET comment = 'A managed Kubernetes service EKS, GKE or AKS moves the control plane to the provider. Etcd, the API server, the scheduler and controller-manager are patched, backed up and hardened by them.

What does not transfer: node OS patching in self-managed node groups, workload
configuration, RBAC, network policy, admission control, and the identity binding
between a workload and the cloud account.'
WHERE measure_id = 'SEC01-BP05-K8S-001' AND comment = 'AWS EKS provides a fully managed Kubernetes service. This allows you to delegate control plane management to the AWS team and focus on workloads.';
UPDATE action_items SET comment = 'Don''t use secrets hardcoding. Implement strict controls to access API credentials, encrypt them and rotate regularly.

Don''t store secrets and keys inside the system prompt'
WHERE measure_id = 'SEC02-BP03-AI-001' AND comment = 'Dont use secrets hardcoding. Implement strict controls to access API credentials, encrypt them and rotate regularly.

Dont store secrets and keys inside the system prompt';
UPDATE action_items SET comment = 'Create separate AWS Account and use it as delegated administrator for the AWS IAM Identity Center. Configure SSO and enable SCIM to automate users provisioning. E.g., IdP Okta. 

Implement alerts for the local IAM users creation based on events in AWS CloudTrail logs. Configure exception for the authorized user creation flow.'
WHERE measure_id = 'SEC02-BP04-AWS-001' AND comment = 'Consider using centralized Identity Provider, enable SCIM. For example, AWS IAM Identity Center and IdP Okta.

Implement alerts for the new IAM users creation using AWS CloudTrail logs.  Configure exceptions for authorized user creation flow.';
UPDATE action_items SET comment = 'Don''t try to chase the tail. Find the balance between security and usability. Focus on sensitive resources and actions.'
WHERE measure_id = 'SEC03-BP02-AWS-001' AND comment = 'Dont try to chase the tail. Find the balance between security and usability. Focus on sensitive resources and actions.';
UPDATE action_items SET comment = 'Configure a Kubernetes audit policy to capture API server activity.

There is no option to customize audit policy for AWS Elastic Kubernetes Service (EKS). Audit logs are delivered to the AWS CloudWatch.

In self-managed Kubernetes clusters, you should define an audit policy on each control-plane node.

Alternatively, a Dynamic Admission Webhook can be used to intercept and record API requests, but it has limitations: it can''t capture read-only operations, and it logs only authenticated and authorized requests.'
WHERE measure_id = 'SEC04-BP01-K8S-001' AND comment = 'Configure a Kubernetes audit policy to capture API server activity.

There is no option to customize audit policy for AWS Elastic Kubernetes Service (EKS). Audit logs are delivered to the AWS CloudWatch.

In self-managed Kubernetes clusters, you should define an audit policy on each control-plane node.

Alternatively, a Dynamic Admission Webhook can be used to intercept and record API requests, but it has limitations: it cant capture read-only operations, and it logs only authenticated and authorized requests.';
UPDATE action_items SET comment = 'Consider deploying SIEM on Amazon OpenSearch service.

AWS Detective and Security Lake can be useful for this purpose as well. Keep in mind that  AWS Detective doesn''t build relations between the affected resources and identities. This is a  limitation of the service which makes it less useful for security use cases. AWS Security Lake allows to get access to the raw data from the AWS Detective interface.'
WHERE measure_id = 'SEC04-BP02-AWS-001' AND comment = 'Consider deploying SIEM on Amazon OpenSearch service.

AWS Detective and Security Lake can be useful for this purpose as well. Keep in mind that  AWS Detective doesnt build relations between the affected resources and identities. This is a  limitation of the service which makes it less useful for security use cases. AWS Security Lake allows to get access to the raw data from the AWS Detective interface.';
UPDATE action_items SET comment = 'Consider Trivy, Checkov or KICS to scan your IaC code for misconfigurations as part of the CI pipeline. Enable blocking mode to prevent insecure changes. 

Note: Checkov doesn''t provide information about the severity of the misconfiguration. In case of Terraform modules usage, the better scan quality can be achieved using Terraform plan output scanning option. Trivy supports this.'
WHERE measure_id = 'SEC04-BP04-AWS-003' AND comment = 'Consider Trivy, Checkov or KICS to scan your IaC code for misconfigurations as part of the CI pipeline. Enable blocking mode to prevent insecure changes. 

Note: Checkov doesnt provide information about the severity of the misconfiguration. In case of Terraform modules usage, the better scan quality can be achieved using Terraform plan output scanning option. Trivy supports this.';
UPDATE action_items SET comment = 'Implement AWS GuardDuty or open-source solutions like Suricata or Snort to analyze network activity for connections with malicious IP addresses, suspicious DNS requests and detect Data Exfiltartion attempts.

Bring extra attention to these AWS GuardDuty findings:
- UnauthorizedAccess:EC2/MetadataDNSRebind
- UnauthorizedAccess:Runtime/MetadataDNSRebind
That''s an indicator of successful SSRF attack. '
WHERE measure_id = 'SEC05-BP03-AWS-001' AND comment = 'Implement AWS GuardDuty or open-source solutions like Suricata or Snort to analyze network activity for connections with malicious IP addresses, suspicious DNS requests and detect Data Exfiltartion attempts.

Bring extra attention to these AWS GuardDuty findings:
- UnauthorizedAccess:EC2/MetadataDNSRebind
- UnauthorizedAccess:Runtime/MetadataDNSRebind
Thats an indicator of successful SSRF attack. ';

-- Updated default impact/effort
UPDATE scoring SET impact = 'high', effort = 'low'
WHERE measure_id = 'SEC01-BP05-K8S-001' AND is_default = 1 AND impact = 'medium' AND effort = 'low';
