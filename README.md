# AWS Security Maturity Dashboard

## 🎯 Overview

This tool evaluates the maturity of your AWS environment and displays the results in an interactive web-based chart. By grounding decisions in these data-driven insights, you can define a cloud-security roadmap with greater precision.

The dashboard provides a comprehensive view of security controls across multiple domains including Security Foundations, Identity & Access Management, Detection, Infrastructure Protection, Data Protection, Incident Response, and Application Security.

<img src="dashboard.png" alt="Dashboard" width="750"/>

## 🚀 Quick Start

1. **Open the Dashboard**: Simply open `index.html` in your web browser
2. **View Maturity Scores**: All security controls are pre-configured with standardized scores:
   - **Before**: 1 (Initial baseline)
   - **Current Maturity**: 2 (Current state)
   - **Goal**: 3 (Target state)
3. **Customize**: Modify `data.yaml` to reflect your actual security posture

## 📊 Assessment

Assign a weight to each security control by rating both its **Impact** and **Effort**. Then, for every control, capture three points on the timeline — its initial maturity, its current maturity, and the target maturity you aim to reach, reflecting the control's adoption status.

### Maturity Levels
- **0**: Not Implemented
- **1**: Basic Implementation
- **2**: Intermediate Implementation  
- **3**: Advanced Implementation

<img src="assessment.png" alt="Assessment" width="750"/>

## ⚙️ Configuration

### Current Configuration
All security controls are currently configured with:
- **before: 1** - Starting point (89 action items)
- **maturity: 2** - Current implementation level (89 action items)
- **goal: 3** - Target implementation level (89 action items)

### Tags
Security controls are tagged for easy filtering:
- `aws` - AWS-specific controls
- `kubernetes` - Kubernetes-specific controls

## 🔧 Customization

Modify the `data.yaml` file according to your vision and requirements. The source data file can be easily adjusted based on your needs.

### Data Structure
```yaml
security_domains:
  - name: "Domain Name"
    security_controls:
      - code: "SEC01-BP01"
        text: "Control Description"
        action_items:
          - measure: "Action Item"
            impact: high|medium|low
            effort: high|medium|low
            before: 0-3
            maturity: 0-3
            goal: 0-3
            tags: aws|kubernetes
```

<img src="source.png" alt="Source Configuration" width="750"/>

## 🔄 Updating Scores

To update maturity scores:

1. **Manual Edit**: Modify values directly in `data.yaml`
2. **Bulk Update** (using terminal):
   ```bash
   # Set all 'before' values to 1
   sed -i '' 's/before: [0-9]/before: 1/g' data.yaml
   
   # Set all 'maturity' values to 2  
   sed -i '' 's/maturity: [0-9]/maturity: 2/g' data.yaml
   
   # Set all 'goal' values to 3
   sed -i '' 's/goal: [0-9]/goal: 3/g' data.yaml
   ```

## 🌐 Browser Cache

If you don't see updated values after modifying `data.yaml`:

1. **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
2. **Clear Cache**: Use browser developer tools to clear cache
3. **Private Mode**: Open in incognito/private browsing mode

## 📈 Security Domains Covered

1. **Security Foundations** - 8 controls, 14 action items
2. **Identity & Access Management** - 15 controls, 21 action items  
3. **Detection** - 4 controls, 10 action items
4. **Infrastructure Protection** - 11 controls, 17 action items
5. **Data Protection** - 9 controls, 13 action items
6. **Incident Response** - 8 controls, 10 action items
7. **Application Security** - 8 controls, 14 action items

**Total**: 63 security controls, 89 action items

## 🎨 Features

- ✅ Interactive web-based visualization
- ✅ Standardized maturity progression (1→2→3)
- ✅ Impact and effort weighting
- ✅ AWS and Kubernetes specific controls
- ✅ MITRE ATT&CK framework mapping
- ✅ Customizable data source
- ✅ No external dependencies

## 📄 License

This tool is provided as-is for educational and assessment purposes.