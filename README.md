# Cloud Native Application Security Maturity Dashboard

## 🎯 Overview

This tool evaluates the maturity of your cloud native security environment and displays the results in an interactive web-based dashboard. By grounding decisions in these data-driven insights, you can define a comprehensive security roadmap with greater precision.

The dashboard provides a comprehensive view of security controls across multiple domains including Security Foundations, Identity & Access Management, Detection, Infrastructure Protection, Data Protection, Incident Response, and Application Security.

**Key Features:**
- 🔗 **MITRE ATT&CK Integration**: Clickable links to detailed attack technique documentation
- 📊 **Dual Tag Support**: Separate scoring for AWS and Kubernetes environments
- 💾 **Flexible Data Management**: Load and save scoring configurations independently
- 🎨 **Modern UI**: Dark theme with responsive design
- 📱 **Local & Server Ready**: Works both locally and on web servers

<img src="/images/dashboard.png" alt="Dashboard" width="750"/>

## 🚀 Quick Start

### Option 1: Web Server Deployment
1. **Deploy Files**: Upload all files to your web server
2. **Open Dashboard**: Navigate to `index.html` in your browser
3. **Auto-Load**: `controls.yaml` and `scoring.yaml` load automatically

### Option 2: Local Usage
1. **Open Dashboard**: Open `index.html` directly in your browser
2. **Load Controls**: Click "Load Controls File" to select `controls.yaml`
3. **Load Scoring**: Optionally load a custom `scoring.yaml` or use defaults

### Initial Configuration
All security measures start with baseline scores:
- **Before**: 0 (Not implemented)
- **Current Maturity**: 0 (Current state)
- **Goal**: 0 (Target state)

## 📊 Assessment

Assign a weight to each security control by rating both its **Impact** and **Effort**. Then, for every control, capture three points on the timeline — its initial maturity, its current maturity, and the target maturity you aim to reach, reflecting the control's adoption status.

### Maturity Levels
- **0**: Not Implemented
- **1**: Ad-hoc
- **2**: Partial Adoption  
- **3**: Full Adoption

<img src="/images/assessment.png" alt="Assessment" width="750"/>

## ⚙️ Configuration

### File Structure
The dashboard uses two main configuration files:

**`controls.yaml`** - Security control definitions:
- Security domains and controls
- Action items with unique `measure_id`
- MITRE ATT&CK technique mappings
- Comments and descriptions

**`scoring.yaml`** - Maturity assessment data:
- Impact and effort ratings
- Before, current, and goal maturity scores
- Linked to controls via `measure_id`

### Current Configuration
All security measures are initialized with baseline scores:
- **before: 0** - Not implemented (89 action items)
- **maturity: 0** - Current implementation level (89 action items)  
- **goal: 0** - Target implementation level (89 action items)

### Tags
Security controls are tagged for environment-specific filtering:
- `aws` - AWS-specific controls (can be scored separately)
- `kubernetes` - Kubernetes-specific controls (can be scored separately)

## 🔧 Customization

### Controls Configuration (`controls.yaml`)
```yaml
security_domains:
  - name: "Domain Name"
    security_controls:
      - code: "SEC01-BP01"
        text: "Control Description"
        action_items:
          - measure_id: "SEC01-BP01-001"
            measure: "Action Item Description"
            comment: "Additional details and links"
            mitre: "Tactic:Technique"
            tags: aws|kubernetes
```

### Scoring Configuration (`scoring.yaml`)
```yaml
measures:
  SEC01-BP01-001:
    impact: high|medium|low|undefined
    effort: high|medium|low|undefined
    before: 0-3|undefined
    maturity: 0-3|undefined
    goal: 0-3|undefined
```


## 🔄 Updating Scores

### Dashboard Interface
1. **Load Files**: Use "Load Scoring File" button to load custom scoring configurations
2. **Edit Values**: Update impact, effort, before, maturity, and goal values directly in the UI
3. **Save Changes**: Use "Save Scoring File" button to save your modifications
4. **Auto-Save**: Changes are tracked and can be saved when needed

### Manual File Editing
Edit `scoring.yaml` directly:
```yaml
measures:
  SEC01-BP01-001:
    impact: high
    effort: medium
    before: 1
    maturity: 2
    goal: 3
```

### Bulk Updates (Terminal)
```bash
# Set all 'before' values to 1
sed -i '' 's/before: [0-9]/before: 1/g' scoring.yaml

# Set all 'maturity' values to 2  
sed -i '' 's/maturity: [0-9]/maturity: 2/g' scoring.yaml

# Set all 'goal' values to 3
sed -i '' 's/goal: [0-9]/goal: 3/g' scoring.yaml
```

## 🌐 Browser Support

### Local File Access
When opening `index.html` locally:
- Modern browsers require user interaction to load files
- Click "Load Controls File" to select `controls.yaml`
- Scoring data can be loaded separately or use defaults

### Web Server Deployment  
When deployed on a web server:
- Files load automatically
- No user interaction required
- Full functionality available

### Browser Cache
If changes aren't visible:
1. **Hard Refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
2. **Clear Cache**: Use browser developer tools
3. **Private Mode**: Open in incognito/private browsing

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

### Core Functionality
- ✅ **Interactive Dashboard**: Web-based visualization with charts and tables
- ✅ **Flexible Scoring**: 4-level maturity progression (0→1→2→3)
- ✅ **Impact & Effort Weighting**: Prioritize controls based on business impact
- ✅ **Dual Environment Support**: Separate AWS and Kubernetes scoring
- ✅ **MITRE ATT&CK Integration**: Clickable links to attack techniques
- ✅ **Modular Data Structure**: Separate controls and scoring files

### User Experience
- ✅ **Dark Theme**: Modern, eye-friendly interface
- ✅ **Local & Server Ready**: Works offline and online
- ✅ **File Management**: Load and save scoring configurations
- ✅ **Undefined Value Handling**: Exclude incomplete measures from calculations
- ✅ **Visual Indicators**: Highlight undefined values and progress
- ✅ **No Dependencies**: Pure HTML/CSS/JavaScript solution

### MITRE ATT&CK Features
- 🔗 **Clickable Links**: Direct links to `thinkcnap.org` technique pages
- 📝 **Lowercase URLs**: SEO-friendly and standardized link format
- 🎯 **Structured Paths**: `/mitre/{tactic}/{technique}.html` format
- 📊 **Technique Mapping**: Link security controls to attack techniques

## 📄 License

This tool is provided as-is for educational and assessment purposes.