INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (1, 1, 'SEC01-BP01-AWS-001', 'MITIGATION: Implement a multi-account AWS structure', 'Deploy AWS Organizations and AWS Control Tower to manage multi-account structure. This will ensure better blast radius management, compliance boundaries and centralized billing.

Separate AWS accounts by environment, team, workload type. ', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (3, 1, 'SEC01-BP01-K8S-001', 'MITIGATION: Implement a multi-cluster Kubernetes environment', 'Separate Kubernetes clusters by environment, team, workload type. 
', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (5, 2, 'SEC01-BP02-AWS-001', 'MITIGATION: Dont use root user for business as usual tasks', 'Configure MFA for the root user. Dont maintain any access and secret keys for the root user.

Enable centralized root access in IAM and delete root user credentials for the AWS  Organizations member accounts.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (6, 2, 'SEC01-BP02-AWS-002', 'DETECTION: Implement root user activity monitoring', 'Configure root user usage monitoring via AWS CloudTrail logs.

Respond to AWS GuardDuty findings "Root Credential Usage" and "Short Term Root Credential Usage".', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (7, 3, 'SEC01-BP03-AWS-001', 'DETECTION: Manage security controls according to the risks', 'Enable those security frameworks in your CSPM which are relevant to your workloads, adjust the severity of the controls.  

In case of AWS SecurityHub Automations usage, take into account that they are  region-linked, even if you configured Delegated Administrator account and set home region for cross-account / cross-region security findings aggregation. That means you need to configure the automations in each region you have in your Delegated Administrator account.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (8, 4, 'SEC01-BP04-AWS-001', 'MITIGATION: Regular update security tools configuration', 'Rely on AWS managed tools like AWS GuardDuty and SecurityHub to delegate updates to the cloud provider.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (9, 5, 'SEC01-BP05-AWS-001', 'MITIGATION: Use AWS managed services to reduce security scope', 'Consider AWS managed services like AWS RDS to reduce operational overhead and delegate control plane management to the cloud provider. Ensure that you understand the shared responsibility model for each service.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (10, 5, 'SEC01-BP05-K8S-001', 'MITIGATION: Use AWS EKS to reduce security scope', 'AWS EKS provides a fully managed Kubernetes service. This allows you to delegate control plane management to the AWS team and focus on workloads.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (11, 6, 'SEC01-BP06-AWS-001', 'MITIGATION: Automate security tools deployment', 'Enable AWS GuardDuty and SecurityHub "auto-enable" feature to automate the process of security tools deployment. This will allow you to ensure 100% coverage for cloud environments.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (12, 7, 'SEC01-BP07-AWS-001', 'MITIGATION: Implement threat modeling sessions', 'Do AWS Workshop "Threat modeling for builders". It relies on "4Q" framework:
- What are we working on? (Define the system)
- What can go wrong? (Identify threats)
- What are we going to do about it? (Determine mitigations)
- Did we do a good job? (Validate and review)

Threat Modeling will allow to identify and mitigate potential security risks on early stage.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (13, 8, 'SEC01-BP08-AWS-001', 'DETECTION: Subscribe to the vendor updates', 'Subscribe to Amazon SNS GuardDuty and SecurityHub announcements. This will allow you to stay up to date with the latest security features and best practices.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (14, 9, 'SEC02-BP01-AWS-001', 'MITIGATION: Configure AWS Password Policy and MFA', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (15, 10, 'SEC02-BP02-AWS-001', 'MITIGATION: Use AWS IAM roles instead of IAM keys', 'Avoid using IAM access and secret keys. Use AWS IAM roles for you services and third-party integrations to grant access to the AWS resources.

Migrate from IMDS v1 to IMDS v2. Use AWS Declarative Policy to set defaults for IMDS v2.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (17, 11, 'SEC02-BP03-AWS-001', 'MITIGATION: Implement Secrets Management solution', 'Implement AWS Secrets Manager or Hashicorp Vault to manage secrets securely.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (18, 12, 'SEC02-BP04-AWS-001', 'MITIGATION: Delegate Identity Management to the Identity Provider', 'Consider using centralized Identity Provider, enable SCIM. For example, AWS IAM Identity Center and IdP Okta.

Implement alerts for the new IAM users creation using AWS CloudTrail logs.  Configure exceptions for authorized user creation flow.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (20, 13, 'SEC02-BP05-AWS-001', 'DETECTION: Implement monitoring of IAM credentials', 'Consider AWS IAM Access Analyzer to detect unused credentials based on inactivity period and aggregate security finding in AWS SecurityHub.

Integrate AWS Health with AWS SecurityHub. Configure alerts regarding AWS IAM keys compromise detection.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (21, 13, 'SEC02-BP05-AWS-002', 'MITIGATION: Implement IAM credentials rotation', 'Automate the process of credentials rotation via integration with Secrets Management service. Focus on IAM users with sensitive permissions. Use crowdsourced list of sensitive IAM actions:
https://github.com/primeharbor/sensitive_iam_actions', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (23, 14, 'SEC02-BP06-AWS-001', 'MITIGATION: Use groups and attributes to manage identities ', 'Use departments, teams, projects, etc. to manage identities and simplify permissions management.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (24, 15, 'SEC03-BP01-AWS-001', 'MITIGATION: Implement Role Based Access Control (RBAC) in AWS', 'Consider AWS IAM roles and policies to manage access to the AWS resources based on employee department, project.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (25, 15, 'SEC03-BP01-K8S-001', 'MITIGATION: Implement Role Based Access Control in Kubernetes', 'Consider Kubernetes Roles and RoleBindings to manage access to the Kubernetes resources based on employee department, project.

Try https://yprobe.loworbitsecurity.com/ to check RBAC permissions.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (26, 16, 'SEC03-BP02-AWS-001', 'MITIGATION: Grant access base on business needs', 'Dont try to chase the tail. Find the balance between security and usability. Focus on sensitive resources and actions.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (27, 17, 'SEC03-BP03-AWS-001', 'MITIGATION: Establish emergency access process', 'Implement emergency access for the root user. Split the root user password / MFA between the Security team and Infra / DevOps team.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (28, 18, 'SEC03-BP04-AWS-001', 'MITIGATION: Reduce permissions continuously', 'Use AWS IAM Access Analyzer to detect unused permissions.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (29, 18, 'SEC03-BP04-K8S-001', 'MITIGATION: Reduce container privileges ', 'Avoid using of the privileged containers. Drop all capabilities and set only those which are needed. ', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (30, 19, 'SEC03-BP05-AWS-001', 'MITIGATION: Define permission guardrails for your organization', 'Implement AWS IAM permissions boundaries to set the maximum permissions that an identity-based policy can grant to an IAM entity.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (31, 20, 'SEC03-BP06-AWS-001', 'MITIGATION: Manage access based on lifecycle', 'Remove access to the resources after they are no longer needed: user termination, project involvement changes, etc.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (32, 21, 'SEC03-BP07-AWS-001', 'DETECTION: Analyze public and cross-account access', 'Deploy AWS IAM Access Analyzer and configure external access analyzer. This will allow to detect public resources and cross-account access outside the trusted zone (your AWS Account or AWS Organization).', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (33, 22, 'SEC03-BP08-AWS-001', 'MITIGATION: Share resources securely within your organization', 'Add conditional access to the AWS resources. For example, allow access only from your AWS Organization:
- https://aws.amazon.com/blogs/security/how-to-control-access-to-aws-resources-based-on-aws-account-ou-or-organization', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (34, 23, 'SEC03-BP09-AWS-001', 'MITIGATION: Share resources securely with a third party', 'Use AWS IAM External ID to share resources securely with a third party.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (35, 24, 'SEC04-BP01-AWS-001', 'DETECTION: Configure AWS CloudTrail to record API activity', 'Configure logging. Create multi-region trail and apply it to the AWS Organization. Enable logging for both management and data events.

Protect the logs. Export AWS CloudTrail logs to the AWS S3 bucket. Enable encryption and log files validation. Enforce AWS Service Control Policy to protect AWS CloudTrail related resources.

Build monitoring. Control AWS CloudTrail configuration changes. Respond to AWS GuardDuty finding Stealth:IAMUser/CloudTrailLoggingDisabled. ', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (36, 24, 'SEC04-BP01-K8S-001', 'DETECTION: Configure Kubernetes audit logging', 'Configure a Kubernetes audit policy to capture API server activity.

There is no option to customize audit policy for AWS Elastic Kubernetes Service (EKS). Audit logs are delivered to the AWS CloudWatch.

In self-managed Kubernetes clusters, you should define an audit policy on each control-plane node.

Alternatively, a Dynamic Admission Webhook can be used to intercept and record API requests, but it has limitations: it cant capture read-only operations, and it logs only authenticated and authorized requests.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (38, 25, 'SEC04-BP02-AWS-001', 'DETECTION: Implement Security Information & Event Management platform (SIEM)', 'Consider deploying SIEM on Amazon OpenSearch service.

AWS Detective and Security Lake can be useful for this purpose as well. Keep in mind that  AWS Detective doesnt build relations between the affected resources and identities. This is a  limitation of the service which makes it less useful for security use cases. AWS Security Lake allows to get access to the raw data from the AWS Detective interface.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (39, 25, 'SEC04-BP02-K8S-001', 'DETECTION: Integrate Kubernetes infrastructure with a SIEM platform', 'Set up your SIEM solution to collect Kubernetes audit and runtime logs.

For AWS EKS, integrate AWS CloudWatch with AWS Data Firehose to export audit logs to an S3 bucket for long-term storage and compliance purposes. Alternatively, leverage AWS Detective and AWS Security Lake to centralize AWS EKS log aggregation and provide your Security Operations Center (SOC) team with an intuitive investigation interface.

For self-managed Kubernetes clusters, configure the audit log backend (file or webhook) to enable seamless SIEM integration.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (40, 26, 'SEC04-BP03-AWS-001', 'DETECTION: Monitor cloud environment for suspicious activity', 'Deploy AWS GuardDuty IDS to detect suspicious API calls. 

Optional: use Sigma rules (https://github.com/SigmaHQ/sigma/).', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (42, 26, 'SEC04-BP03-K8S-001', 'DETECTION: Monitor Kubernetes environment for suspicious activity', 'For Amazon Elastic Kubernetes Service, enable AWS GuardDuty "EKS Protection". It detects potential threats by analyzing EKS audit logs using machine learning and anomaly detection. To observe and analyze operating system-level, networking, and file events use AWS GuardDuty "Runtime Monitoring".

For self-managed Kubernetes cluster, apply custom correlation rules or rely on third-party engines.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (44, 27, 'SEC04-BP04-AWS-001', 'DETECTION: Implement Cloud Security Posture Management System (CSPM)', 'Use AWS SecurityHub to detect non-compliant resources. 

There are open-source tools as Prowler and Nuclei:
- https://github.com/prowler-cloud/prowler
- https://github.com/projectdiscovery/nuclei', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (45, 27, 'SEC04-BP04-AWS-002', 'MITIGATION: Implement AWS Security Policies', 'Deploy AWS Service Control Policies and AWS Declarative Policies as preventive guardrails to avoid security misconfiguration.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (46, 27, 'SEC04-BP04-K8S-001', 'DETECTION: Implement Kubernetes Security Posture Management System (KSPM)', 'Deploy trivy-operator to Kubernetes to detect non-compliant resources. Consider Kyverno Policy Reporter as UI for the findings visualization.

Try https://yprobe.loworbitsecurity.com/ to check pods specification for insecure configurations.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (47, 27, 'SEC04-BP04-K8S-002', 'MITIGATION: Deploy Kubernetes Dynamic Admission Controller', 'Deploy dynamic admission controller like Kyverno or OPA Gatekeeper to prevent insecure changes.

Consider Helm chart security scanning as part of the CI pipeline. Enable blocking mode.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (49, 28, 'SEC05-BP01-AWS-001', 'MITIGATION: Separate workloads by VPCs and subnets', 'Apply different type of restrictions to the network layers. Create subnets with and without Internet access.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (50, 29, 'SEC05-BP02-AWS-001', 'MITIGATION: Control traffic flow within your network layers', 'Deploy AWS Network Firewall, configure AWS Security Groups.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (51, 29, 'SEC05-BP02-K8S-001', 'MITIGATION: Control traffic flow between the pods', 'Consider Istio or Cilium.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (52, 30, 'SEC05-BP03-AWS-001', 'DETECTION: Implement Network Intrusion Detection System', 'Implement AWS GuardDuty or open-source solutions like Suricata or Snort to analyze network activity for connections with malicious IP addresses, suspicious DNS requests and detect Data Exfiltartion attempts.

Bring extra attention to these AWS GuardDuty findings:
- UnauthorizedAccess:EC2/MetadataDNSRebind
- UnauthorizedAccess:Runtime/MetadataDNSRebind
Thats an indicator of successful SSRF attack. ', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (55, 30, 'SEC05-BP03-AWS-002', 'MITIGATION: Implement Web Application Firewall', 'Implement AWS WAF or Imperva / CloudFlare.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (56, 31, 'SEC05-BP04-AWS-001', 'MITIGATION: Automate network protection', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (57, 32, 'SEC06-BP01-AWS-001', 'DETECTION: Scan EC2 instances for vulnerabilities', 'Use AWS Inspector. It supports both agent and agentless scanning options. 

Consider open-source tool like Wazuh Agent. 

Rely on Exploit Prediction Scoring System (EPSS), environment (prod, staging, dev, etc.) and endpoint exposure (internal, internet-facing) to get the right prioritization for the findings.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (58, 32, 'SEC06-BP01-K8S-002', 'DETECTION: Scan docker images for vulnerabilities ', 'Enable AWS ECR basic scanning or AWS Inspector enhanced scanning.  

As an alternative, consider open-source tool Trivy to conduct docker images scanning. Attach, SBOM to the docker images.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (59, 33, 'SEC06-BP02-AWS-001', 'MITIGATION: Provision compute from hardened images', 'Consider AWS managed AMIs.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (60, 33, 'SEC06-BP02-K8S-002', 'MITIGATION: Migrate to distroless and golden images', 'Adopt minimalistic images as baseline and develop golden images for specific tech stacks (Python, Java).

Consider third-party hardened images (from AWS, Azure, Google, etc).

Implement docker images hardening tool to identify unused packages for removal through container runtime analysis (for example, RapidFort).

During the deployment process rely on immutable tags and image digest.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (61, 34, 'SEC06-BP03-AWS-001', 'MITIGATION: Reduce manual management and interactive access', 'Use AWS Systems Manager or Ansible/Chef/Puppet.

Implement strict access controls regarding configuration management tools.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (62, 34, 'SEC06-BP03-AWS-002', 'DETECTION: Detect command execution on EC2 instances', 'Anaylyze AWS CloudTrail logs to detect suspicious command execution on EC2 instances via AWS Systems Manager.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (63, 35, 'SEC06-BP04-AWS-001', 'MITIGATION: Implement File Integrity Monitoring (FIM)', 'Consider using osquery to validate software integrity via its file integrity monitoring tables and scheduled queries. For endpoint-level monitoring, Wazuh FIM provides continuous hashing, real-time alerts, and baseline comparison.

Additionally, eBPF-based solutions such as Falco or Tetragon can be deployed to detect unauthorized or anomalous file modifications.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (64, 35, 'SEC06-BP04-K8S-002', 'MITIGATION: Set up Docker image signing and verification', 'Consider Cosign tool from Sigstore for the digital signing and verification of container images.

# Example
$ cosign sign --key cosign.key aliaksxssv/attack-simulation:latest
$ cosign verify --key cosign.pub aliaksxssv/attack-simulation:latest', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (65, 36, 'SEC06-BP05-AWS-001', 'MITIGATION: Automate compute protection', 'Implement AWS Tags to manage your resources and security controls.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (66, 37, 'SEC07-BP01-AWS-001', 'DETECTION: Understand your data classification scheme', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (67, 38, 'SEC07-BP02-AWS-001', 'MITIGATION: Apply data protection controls based on data sensitivity', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (68, 39, 'SEC07-BP03-AWS-001', 'DETECTION: Automate data identification and classification in AWS', 'Consider AWS Macie to detect resources with sensitive data.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (69, 39, 'SEC07-BP03-K8S-001', 'DETECTION: Inspect containers and pod-level network traffic for sensitive data', 'Consider DSPM solution (e.g., soveren.io) to scan Kubernetes workloads for PII and PCI data.

Consider read-only file system for containers to reduce the risk of data exposure.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (70, 40, 'SEC07-BP04-AWS-001', 'MITIGATION: Define data retention policy', 'Use AWS S3 Lifecycle Policies or AWS EBS Snapshots.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (72, 41, 'SEC08-BP01-AWS-001', 'MITIGATION: Implement key management system', 'Consider AWS KMS.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (73, 42, 'SEC08-BP02-AWS-001', 'MITIGATION: Enforce encryption at rest', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (74, 43, 'SEC08-BP03-AWS-001', 'MITIGATION: Automate data at rest protection', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (75, 44, 'SEC08-BP04-AWS-001', 'MITIGATION: Manage access based on data sensitivity', 'Implement AWS Tags.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (76, 45, 'SEC09-BP01-AWS-001', 'MITIGATION: Deploy PKI infrastructure', 'Use AWS Certificate Manager to manage your certificates.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (77, 46, 'SEC09-BP02-AWS-001', 'MITIGATION: Enforce encryption in transit', 'Enforce strict security policies to your  Application Load Balancer', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (78, 46, 'SEC09-BP02-K8S-001', 'MITIGATION: Enforce pod-level network traffic encryption', 'Deploy Istio or Cilium to secure communications between the pods.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (79, 47, 'SEC09-BP03-AWS-001', 'MITIGATION: Use TLS certificates to authenticate the network communications', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (80, 47, 'SEC09-BP03-K8S-001', 'MITIGATION: Configure mutual TLS (mTLS) communication between pods ', 'Deploy Istio or Cilium to secure communications between the pods.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (81, 48, 'SEC10-BP01-AWS-001', 'DETECTION: Build the Security Operations Center', 'Define team responsibilities and scope.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (82, 49, 'SEC10-BP02-AWS-001', 'DETECTION: Develop incident management plans', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (83, 50, 'SEC10-BP03-AWS-001', 'DETECTION: Check AWS CloudTrail logs availability', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (85, 51, 'SEC10-BP04-AWS-001', 'DETECTION: Develop and test security incident response playbooks', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (86, 52, 'SEC10-BP05-AWS-001', 'MITIGATION: Pre-provision access to AWS accounts', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (88, 53, 'SEC10-BP06-AWS-001', 'MITIGATION: Implement Case Management System', 'Deploy the service to track security findings. ', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (89, 53, 'SEC10-BP06-AWS-002', 'MITIGATION: Implement Sandbox environment ', 'The SOC team should be able to test suspicious files for malicious code.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (90, 53, 'SEC10-BP06-AWS-003', 'MITIGATION: Implement Security Orchestration, Automation, and Response (SOAR)', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (91, 54, 'SEC10-BP07-AWS-001', 'DETECTION: Run simulations to test the incident response playbooks', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (92, 55, 'SEC10-BP08-AWS-001', 'MITIGATION: Implement lessons learned from the post-incident activity', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (93, 56, 'SEC11-BP01-AWS-001', 'MITIGATION: Train Developer and QA teams for application security', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (94, 57, 'SEC11-BP02-AWS-001', 'MITIGATION: Integrate security scanners into CI pipilene', 'Implement SAST, DAST, SCA into CI pipeline. Block risky changes.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (95, 58, 'SEC11-BP03-AWS-001', 'DETECTION: Perform regular penetration testing', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (96, 58, 'SEC11-BP03-AWS-002', 'DETECTION: Implement Bug Bounty program', 'Consider HackerOne or Bugcrowd for this.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (97, 59, 'SEC11-BP04-AWS-001', 'DETECTION: Conduct code reviews', 'Consider manual code review or AI Assistant like CodeRabbit.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (98, 60, 'SEC11-BP05-AWS-001', 'MITIGATION: Centralize services for packages and dependencies', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (99, 61, 'SEC11-BP06-AWS-001', 'MITIGATION: Deploy software programmatically', 'Exclude manual deployments.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (100, 62, 'SEC11-BP07-AWS-001', 'MITIGATION: Regularly assess security properties of the pipelines', '', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (101, 63, 'SEC11-BP08-AWS-001', 'MITIGATION: Build a program that embeds security ownership in workload teams', 'Consider Internal Developer Portal for this like Backstage from Spotify.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (102, 27, 'SEC04-BP04-AWS-003', 'MITIGATION: Implement IaC Security Scanner', 'Consider Trivy, Checkov or KICS to scan your IaC code for misconfigurations as part of the CI pipeline. Enable blocking mode to prevent insecure changes. 

Note: Checkov doesnt provide information about the severity of the misconfiguration. In case of Terraform modules usage, the better scan quality can be achieved using Terraform plan output scanning option. Trivy supports this.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (103, 11, 'SEC02-BP03-AWS-002', 'DETECTION: Implement Secret Scanning', 'Consider TruffleHog tool to cover secrets Discovery, Classification, Validation, and Analysis:
- https://github.com/trufflesecurity/trufflehog', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (104, 11, 'SEC02-BP03-K8S-001', 'DETECTION: Scan Docker images for secrets', 'Consider aquasecurity/trivy or trufflesecurity/trufflehog to scan Docker images for the secrets.

Focus on the secrets scanning inside the CI pipeline and block it in case of sensitive data detection.

# Example
$ trivy image --security-checks secret --exit-code 1 attack-simulation:latest', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (105, 1, 'SEC01-BP01-K8S-002', 'MITIGATION: Deploy separate container registries for non-prod and prod environments', 'Global registry pose risk as attackers can use it for data exfiltration between environments.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (107, 39, 'SEC07-BP03-AI-001', 'MITIGATION: Implement data sanitization for model training datasets', 'Exclude sensitive data from model training datasets to prevent data breaches.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (108, 26, 'SEC04-BP03-AI-001', 'DETECTION: Monitor LLM responses for PII and sensitive data exposure', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (109, 44, 'SEC07-BP04-AI-001', 'MITIGATION: Protect model training data from unauthorized access', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (110, 16, 'SEC03-BP02-AI-001', 'MITIGATION: Minimize MCP server access scope', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (111, 56, 'SEC11-BP01-AI-001', 'MITIGATION: Configure LLM persistent context in IDE to deliver safe coding practices', 'Set user or team rules in Cursor to define security boundaries during the development process. By default, LLM can generate unsafe code, exposure secrets, run insecure commands. 

Rules example: github.com/matank001/cursor-security-rules.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (112, 60, 'SEC11-BP05-AI-001', 'MITIGATION: Implement source validation to prevent installation of malicious hallucinated packages', 'Malicious actors can discover frequently hallucinated package names, craft fake packages, and introduce malicious code through IDE-suggested installations.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (113, 30, 'SEC05-BP03-AI-001', 'MITIGATION: Implement WAF to prevent LLM unbounded consumption', 'Malicious actor can abuse LLM application to disrupt service. Take care of input validation and rate limiting.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (114, 58, 'SEC11-BP03-AI-001', 'DETECTION: Apply AI Red Teaming to GenAI systems', 'Refer to GenAI Red Teaming Guide from OWASP to follow a practical approach to evaluating AI vulnerabilities. 

Pay extra attention to the improper output handling from LLM downstream to other components and systems.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (115, 32, 'SEC06-BP01-AI-001', 'DETECTION: Execute vulnerability assessments on LLM infrastructure components', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (116, 59, 'SEC11-BP04-AI-001', 'MITIGATION: Connect Security Scanner MCP Server to the IDE', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (117, 4, 'SEC01-BP07-AI-001', 'MITIGATION: Filter user prompt for jailbreak and prompt injection attempts', 'AWS Bedrock has guardrails which can check user inputs and AI outputs, and filter or deny topics that are unsafe.', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (118, 5, 'SEC01-BP05-AI-001', 'MITIGATION: Migrate to managed AI services to reduce security scope', 'AWS Bedrock is an AWS managed service for building GenAI applications. ', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (119, 38, 'SEC07-BP02-AI-001', 'MITIGATION: Block or mask sensitive data in input prompts and model responses', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (120, 15, 'SEC03-BP01-AI-001', 'MITIGATION: Restrict logical access to the model API endpoint ', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (121, 29, 'SEC05-BP02-AI-001', 'MITIGATION: Restrict network access to the model API endpoint', '', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (122, 16, 'SEC03-BP02-K8S-002', 'MITIGATION: Limit workloads permissions outside the cluster', 'Containers should have access only to those external services (AWS S3, RDS, etc) that they are supposed to communicate with. ', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (123, 17, 'SEC03-BP03-K8S-001', 'MITIGATION: Implement Zero Trust PAM', 'In case of emergency, implement Zero Trust PAM tools to secure authentication process and ensure activity monitoring (e.g., Teleport, StrongDM, and HashiCorp).

Avoid direct production access for the software engineers. Implement observability and analytics tools such as Grafana for workloads health monitoring and incident investigation. Establish the delivery process through GitOps practices.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (124, 11, 'SEC02-BP03-AI-001', 'MITIGATION: Protect API keys for AI integrations through secrets management systems', 'Dont use secrets hardcoding. Implement strict controls to access API credentials, encrypt them and rotate regularly.

Dont store secrets and keys inside the system prompt', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (125, 4, 'SEC01-BP07-AI-002', 'MITIGATION: Sanitize LLM output to avoid insecure handling', 'Insecure LLM output handling leads to the such vulnerabilities like XSS, CSRF, Remote Code Execution (RCE), etc. This happens when LLM passes insecure output downstream to other systems and components. ', NULL, 'ai') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (126, 1, 'SEC01-BP01-K8S-003', 'MITIGATION: Isolate resources using Kubernetes namespaces', 'Isolating resources with Kubernetes namespaces is important because it enforces logical separation of workloads and limits the blast radius of any compromise. Namespaces let you apply RBAC, NetworkPolicies, ResourceQuotas, and LimitRanges per environment or team, preventing unauthorized cross-namespace access. This ensures tighter control over traffic, permissions, and resource consumption across the cluster.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (127, 1, 'SEC01-BP01-K8S-004', 'MITIGATION: Isolate containers using cgroups, Linux namespaces and chroot', 'Isolating containers with cgroups, Linux namespaces, and chroot prevents them from accessing host resources directly. Containers must never share the host’s PID, mount, or network namespaces, as this would expose host processes, file systems, or sockets to the container. Using separate namespaces ensures strict process, filesystem, and network isolation, while cgroups limit CPU, memory, and I/O usage to contain potential compromise impact.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (128, 24, 'SEC04-BP01-K8S-002', 'DETECTION: Deploy runtime monitoring components', 'Deploy an eBPF-based sensor on each Kubernetes node to collect low-level telemetry such as process execution, network connections, and filesystem operations.', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (129, 24, 'SEC04-BP01-AWS-002', 'DETECTION: Configure OS logging', 'To enable operating system logging, configure the native audit and event subsystems on each host (such as Linux auditd, systemd-journal, and syslog) to capture key security-relevant events (process execution, authentication attempts, privilege escalations, and file access). On Windows, enable and tune Windows Event Logging, including Security, System, Application, and PowerShell logs, and apply an advanced audit policy to capture detailed authentication and process-creation events.', NULL, 'aws') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (130, 16, 'SEC03-BP02-K8S-001', 'MITIGATION: Limit access to the CI/CD infrastructure', 'Control access permissions to: 
- source code management (e.g., Dockerfile, Helm chart)
- build environment (e.g., GitLab runners)
- container registry (e.g., AWS ECR)', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (131, 54, 'SEC10-BP07-K8S-001', 'DETECTION: Run attack simulation for Kubernetes cluster', 'Consider docker image with ready to use attack simulation scripts (e.g., aliaksxssv/attack-simulation).', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (132, 52, 'SEC10-BP05-K8S-001', 'MITIGATION: Pre-provision access for the SOC team', '1. Access to the container registry.
SOC team should be able to download and analyze images for vulnerabilities, malicious files, secrets, etc.

2. Access to the Kubernetes cluster.
SOC team should have an access to the Kubernetes cluster to get an actual state and configuration of the workloads.

3. Access to the Version Control system.
Access to the version control system like GitLab and GitHub will allow to review the sources for the build and deployment pipelines (Dockerfile, Helm chart, etc).', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (134, 51, 'SEC10-BP04-K8S-001', 'MITIGATION: Develop SOC procedures for Kubernetes forensic investigations', 'Ask you SOC team these questions:
- Do you know how to connect to Kubernetes cluster?
- Do you know how to identity the build / deployment path of the suspicious Kubernetes workload and its current state?
- Do you know how to conduct Kubernetes container filesystem investigation for malicious files?', NULL, 'kubernetes') ON CONFLICT (measure_id) DO NOTHING;
