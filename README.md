# Neshagostar Pardis Documentation Site

A clean, bilingual (Persian/English) markdown documentation renderer for GitHub Pages.

## 🚀 Quick Start

Visit your site at: `https://[your-username].github.io/[repository-name]/`

## 📁 Project Structure

```
.
├── index.html              # Main HTML file
├── styles.css              # Styling
├── script.js               # JavaScript for markdown rendering
├── docs/
│   ├── fa/                 # Persian markdown files
│   │   ├── getting-started.md
│   │   ├── installation-guide.md
│   │   └── robot-selection-guide.md
│   └── en/                 # English markdown files
│       ├── getting-started.md
│       ├── installation-guide.md
│       └── robot-selection-guide.md
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow
└── .nojekyll              # Bypass Jekyll processing
```

## 🌐 Features

- **Bilingual Support**: Switch between Persian (فارسی) and English
- **RTL/LTR Support**: Automatic text direction switching
- **Markdown Rendering**: Full markdown support including tables, code blocks, headers, lists
- **Responsive Design**: Works on all device sizes
- **Clean Interface**: Minimal design focused on documentation readability

## 📝 Adding New Documentation

1. **Add your markdown file** to the appropriate language folder:
   - English: `docs/en/your-file.md`
   - Persian: `docs/fa/your-file.md`

2. **Update the navigation** in `script.js` (lines 46-60):
   ```javascript
   this.files.set('fa', new Map([
       ['your-file', 'عنوان فارسی'],
       // ... other files
   ]));
   
   this.files.set('en', new Map([
       ['your-file', 'English Title'],
       // ... other files
   ]));
   ```

3. **Commit and push** - the site will automatically deploy via GitHub Actions!

## ⚙️ GitHub Pages Setup

1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The site will deploy automatically on push to main branch

## 🛠️ Local Development

```bash
# Simple local server
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## 📄 Current Documentation

- **Getting Started**: Introduction to Neshagostar Pardis products and services
- **Installation Guide**: Complete installation instructions for polyethylene pipes
- **Robot Selection Guide**: Comprehensive guide for industrial robot selection for manufacturing automation

---

🤖 **Powered by clean, modern web technologies**
- Vanilla JavaScript
- CSS Grid & Flexbox  
- GitHub Actions deployment