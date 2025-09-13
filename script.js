class DocumentationRenderer {
    constructor() {
        this.currentLang = 'fa';
        this.files = new Map();
        this.init();
    }

    init() {
        this.setupLanguageButtons();
        this.setupMobileMenu();
        this.loadFilesList();
        this.renderNavigation();
        this.loadFirstDocument();
    }

    setupLanguageButtons() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                if (lang !== this.currentLang) {
                    this.switchLanguage(lang);
                }
            });
        });
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (menuToggle && sidebar && overlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('open');
            });
            
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
            });
            
            // Close menu when clicking on nav links
            sidebar.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        }
    }

    switchLanguage(lang) {
        this.currentLang = lang;
        
        // Update button states
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Update document direction
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        // Update site title based on language
        const siteTitle = document.getElementById('siteTitle');
        if (siteTitle) {
            siteTitle.textContent = lang === 'fa' 
                ? 'مستندات نشاگستر پردیس' 
                : 'Neshagostar Pardis Documentation';
        }
        
        // Re-render navigation and content
        this.renderNavigation();
        this.loadFirstDocument();
    }

    loadFilesList() {
        // Define available files - robot guide sections
        this.files.set('fa', new Map([
            ['executive-summary', 'خلاصه اجرایی'],
            ['robot-specifications', 'مشخصات ربات'],
            ['programming-methods', 'روش‌های برنامه‌نویسی'],
            ['selection-matrix', 'ماتریس انتخاب'],
            ['application-recommendations', 'توصیه‌های کاربردی'],
            ['market-analysis', 'تحلیل بازار'],
            ['cnc-capable-robots', 'ربات‌های قابل CNC'],
            ['cnc-robot-programming', 'آموزش برنامه‌نویسی CNC'],
            ['final-recommendations', 'توصیه‌های نهایی'],
            ['european-robot-marketplace-2025', 'بازار ربات اروپا ۲۰۲۵']
        ]));

        this.files.set('en', new Map([
            ['executive-summary', 'Executive Summary'],
            ['robot-specifications', 'Robot Specifications'],
            ['programming-methods', 'Programming Methods'],
            ['selection-matrix', 'Selection Matrix'],
            ['application-recommendations', 'Application Recommendations'],
            ['market-analysis', 'Market Analysis'],
            ['cnc-capable-robots', 'CNC-Capable Robots'],
            ['cnc-robot-programming', 'CNC Programming Tutorial'],
            ['final-recommendations', 'Final Recommendations'],
            ['european-robot-marketplace-2025', 'European Robot Marketplace 2025']
        ]));
    }

    renderNavigation() {
        const nav = document.getElementById('navigation');
        nav.innerHTML = '';
        
        const files = this.files.get(this.currentLang);
        if (!files) return;

        files.forEach((title, filename) => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = title;
            link.className = 'nav-link';
            link.dataset.file = filename;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadDocument(filename);
                this.setActiveNavItem(link);
            });
            
            nav.appendChild(link);
        });
    }

    setActiveNavItem(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    loadFirstDocument() {
        const files = this.files.get(this.currentLang);
        if (files && files.size > 0) {
            const firstFile = files.keys().next().value;
            this.loadDocument(firstFile);
            
            // Set first nav item as active
            const firstLink = document.querySelector('.nav-link');
            if (firstLink) {
                this.setActiveNavItem(firstLink);
            }
        }
    }

    async loadDocument(filename) {
        try {
            const response = await fetch(`./docs/${this.currentLang}/${filename}.md`);
            if (response.ok) {
                const markdown = await response.text();
                this.renderMarkdown(markdown);
            } else {
                console.error(`Failed to load ${filename}.md: ${response.status} ${response.statusText}`);
                this.renderPlaceholder(filename);
            }
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            this.renderPlaceholder(filename);
        }
    }

    renderPlaceholder(filename) {
        const content = document.getElementById('markdownContent');
        const files = this.files.get(this.currentLang);
        const title = files.get(filename) || filename;
        
        const placeholder = this.currentLang === 'fa' 
            ? `# ${title}\n\n⚠️ خطا در بارگذاری محتوا\n\nفایل \`${filename}.md\` در حال بارگذاری است یا یافت نشد.\n\nلطفاً صفحه را رفرش کنید یا بعداً دوباره امتحان کنید.`
            : `# ${title}\n\n⚠️ Content Loading Error\n\nThe file \`${filename}.md\` is loading or could not be found.\n\nPlease refresh the page or try again later.`;
        
        this.renderMarkdown(placeholder);
    }

    renderMarkdown(markdown) {
        const container = document.getElementById('markdownContent');
        
        // Simple markdown to HTML conversion
        let html = markdown
            // Headers
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            
            // Bold and italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            
            // Unordered lists
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            
            // Ordered lists  
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            
            // Blockquotes
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            
            // Tables (basic support)
            .replace(/\|(.*?)\|/g, (match, content) => {
                const cells = content.split('|').map(cell => cell.trim());
                const cellsHtml = cells.map(cell => `<td>${cell}</td>`).join('');
                return `<tr>${cellsHtml}</tr>`;
            });

        // Wrap paragraphs
        html = '<p>' + html + '</p>';
        html = html.replace(/<\/p><p><h/g, '</p><h').replace(/<\/h([1-6])><p>/g, '</h$1><p>');
        html = html.replace(/<\/p><p><ul>/g, '</p><ul>').replace(/<\/ul><p>/g, '</ul><p>');
        html = html.replace(/<\/p><p><ol>/g, '</p><ol>').replace(/<\/ol><p>/g, '</ol><p>');
        html = html.replace(/<\/p><p><pre>/g, '</p><pre>').replace(/<\/pre><p>/g, '</pre><p>');
        html = html.replace(/<\/p><p><blockquote>/g, '</p><blockquote>').replace(/<\/blockquote><p>/g, '</blockquote><p>');
        
        // Fix list containers
        html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
            return '<ul>' + match + '</ul>';
        });
        html = html.replace(/<\/ul><br><ul>/g, '');
        
        // Fix table containers
        html = html.replace(/(<tr>.*?<\/tr>)/gs, '<table>$1</table>');
        html = html.replace(/<\/table><br><table>/g, '');

        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p><br><\/p>/g, '');

        container.innerHTML = html;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentationRenderer();
});