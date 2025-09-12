# System Architecture & Technical Overview

## System URL Code & Access Points

### **Live System URLs:**
- **Main Site**: [https://neshagostar-pardis.github.io/](https://neshagostar-pardis.github.io/)
- **GitHub Repository**: [https://github.com/neshagostar-pardis/neshagostar-pardis.github.io](https://github.com/neshagostar-pardis/neshagostar-pardis.github.io)
- **GitHub Pages Settings**: [Repository Settings → Pages](https://github.com/neshagostar-pardis/neshagostar-pardis.github.io/settings/pages)

## System Components Architecture

### **1. Frontend Structure**
```
neshagostar-pardis.github.io/
├── index.html           # Main entry point
├── styles.css          # Responsive styling & RTL support
├── script.js           # Bilingual markdown renderer
└── docs/               # Content directory
    ├── en/             # English documentation
    │   ├── executive-summary.md
    │   ├── robot-specifications.md
    │   ├── programming-methods.md
    │   ├── selection-matrix.md
    │   ├── application-recommendations.md
    │   ├── market-analysis.md
    │   ├── final-recommendations.md
    │   └── system-architecture.md
    └── fa/             # Persian documentation
        ├── executive-summary.md
        ├── robot-specifications.md
        ├── programming-methods.md
        ├── selection-matrix.md
        ├── application-recommendations.md
        ├── market-analysis.md
        └── final-recommendations.md
```

### **2. Core System Technologies**

#### **A. HTML5 Structure (`index.html`)**
```html
<!-- Main container with bilingual support -->
<div class="container">
    <header class="header">
        <h1 class="title">Neshagostar Pardis Documentation</h1>
        <div class="controls">
            <button class="menu-toggle">☰</button>
            <div class="language-switcher">
                <button class="lang-btn active" data-lang="fa">فارسی</button>
                <button class="lang-btn" data-lang="en">English</button>
            </div>
        </div>
    </header>
    
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <div class="content">
        <aside class="sidebar" id="sidebar">
            <nav class="navigation" id="navigation">
                <!-- Dynamic navigation populated by JavaScript -->
            </nav>
        </aside>
        
        <main class="main">
            <div class="markdown-content" id="markdownContent">
                <!-- Dynamic content rendered here -->
            </div>
        </main>
    </div>
</div>
```

#### **B. CSS Architecture (`styles.css`)**
- **Base Styles**: Reset, typography, color scheme
- **Layout System**: CSS Grid for main layout, Flexbox for components
- **Responsive Design**: Mobile-first approach with breakpoints
  - Desktop: 1024px+
  - Tablet: 768px-1024px
  - Mobile: <768px
- **RTL Support**: Full Persian language RTL text direction
- **Component Styles**: Header, sidebar, navigation, content area
- **Markdown Rendering**: Custom styles for rendered markdown elements

#### **C. JavaScript Engine (`script.js`)**

**Class: DocumentationRenderer**
```javascript
class DocumentationRenderer {
    constructor() {
        this.currentLang = 'fa';  // Default Persian
        this.files = new Map();   // File mapping
        this.init();
    }

    // Core Methods:
    init()                    // Initialize system
    setupLanguageButtons()    // Language switching
    setupMobileMenu()         // Mobile navigation
    loadFilesList()          // Define available documents
    renderNavigation()       // Build sidebar navigation
    loadDocument(filename)   // Fetch markdown files
    renderMarkdown(markdown) // Convert MD to HTML
    switchLanguage(lang)     // Change language
}
```

**Key Features:**
- **Bilingual File Management**: Separate English/Persian file maps
- **Dynamic Navigation**: Auto-generates sidebar from file definitions
- **Markdown Parser**: Custom regex-based markdown to HTML converter
- **Language Switching**: Seamless Persian ↔ English transitions
- **Mobile Responsive**: Touch-friendly navigation with overlay

### **3. Content Management System**

#### **A. Document Structure**
Each section is a standalone markdown file with consistent formatting:
- **Headers**: H1-H4 hierarchical structure
- **Lists**: Bullet points and numbered lists
- **Tables**: Technical specifications and comparisons
- **Links**: External marketplace and supplier URLs
- **Code Blocks**: Technical specifications and examples
- **Emphasis**: Bold and italic text for key points

#### **B. Bilingual Content Strategy**
- **Source Language**: English (original technical content)
- **Target Language**: Persian with RTL support
- **Translation Approach**: Professional technical translation maintaining:
  - Technical terminology accuracy
  - Robot model numbers and specifications unchanged
  - Contact information and pricing preserved
  - Cultural adaptation for Iranian market context

### **4. Deployment Pipeline**

#### **A. GitHub Actions Workflow (`.github/workflows/deploy.yml`)**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### **B. Automatic Deployment Process**
1. **Trigger**: Push to main branch or manual workflow dispatch
2. **Build**: Package entire repository as static site
3. **Deploy**: Serve through GitHub Pages CDN
4. **Live Update**: Site refreshes within 2-3 minutes

### **5. Technical Specifications**

#### **A. Performance Features**
- **Static Site**: No server-side processing, fast loading
- **CDN Delivery**: GitHub Pages global content delivery network
- **Mobile Optimized**: Responsive design for all devices
- **SEO Ready**: Semantic HTML structure
- **Accessibility**: Proper ARIA labels and keyboard navigation

#### **B. Browser Compatibility**
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Browsers**: iOS Safari, Android Chrome
- **ES6 Features**: Uses modern JavaScript (async/await, arrow functions)
- **CSS Grid/Flexbox**: Modern layout techniques

#### **C. Content Delivery**
- **File Fetching**: Asynchronous markdown file loading
- **Error Handling**: Graceful fallbacks for missing content
- **Caching**: Browser caching for static assets
- **Language Persistence**: Remembers user language preference

### **6. System Monitoring & Maintenance**

#### **A. Available Analytics**
- **GitHub Insights**: Repository traffic and engagement
- **GitHub Pages Analytics**: Page views and referrers
- **Commit History**: Complete change tracking

#### **B. Maintenance Tasks**
- **Content Updates**: Edit markdown files and push to GitHub
- **URL Verification**: Regular checking of external robot marketplace links
- **Translation Updates**: Keep Persian content synchronized with English
- **Performance Monitoring**: Check loading times and mobile performance

### **7. System Access & Management**

#### **A. Content Management**
- **Technical Users**: Direct GitHub repository access
- **Content Editors**: Can edit markdown files through GitHub web interface
- **Administrators**: Full repository permissions for system changes

#### **B. Update Workflow**
1. Edit content in local environment or GitHub web editor
2. Commit changes with descriptive messages
3. Push to main branch
4. GitHub Actions automatically deploys updates
5. Live site updates within 2-3 minutes

## System Health Status

- ✅ **Operational**: All components functional
- ✅ **Responsive**: Mobile and desktop optimized
- ✅ **Bilingual**: Full Persian/English support
- ✅ **Content Complete**: All 7 robot guide sections available
- ✅ **Links Verified**: All 20 robot marketplace URLs working
- ✅ **Auto-Deploy**: GitHub Actions pipeline active

## Quick Access Commands

**For developers working locally:**
```bash
# Clone repository
git clone https://github.com/neshagostar-pardis/neshagostar-pardis.github.io.git

# Serve locally (Python 3)
python3 -m http.server 8000

# Access local site
open http://localhost:8000

# Deploy changes
git add -A
git commit -m "Update description"
git push origin main
```

This documentation system provides a comprehensive, maintainable, and scalable solution for bilingual technical documentation with automatic deployment and responsive design.