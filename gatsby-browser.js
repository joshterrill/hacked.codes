import "./src/normalize.css";
import "./src/style.css";

import "prismjs/themes/prism.css";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import "prismjs/plugins/command-line/prism-command-line.css";

export const onRouteUpdate = () => {
    if (typeof window === 'undefined') return;
    
    setTimeout(() => {
        enhanceCodeBlocks();
        enableInlineCodeSelection();
    }, 100);
};

function enableInlineCodeSelection() {
    const inlineCodes = document.querySelectorAll(':not(pre) > code');
    
    inlineCodes.forEach(code => {
        if (code.dataset.selectionEnabled) return;
        code.dataset.selectionEnabled = 'true';
        
        code.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(code);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });
}

function enhanceCodeBlocks() {
    const highlights = document.querySelectorAll('.gatsby-highlight');
    const highlightArray = Array.from(highlights);
    
    for (let i = 0; i < highlightArray.length; i++) {
        const highlight = highlightArray[i];
        
        if (highlight.classList.contains('enhanced')) continue;
        
        const pre = highlight.querySelector('pre');
        const code = highlight.querySelector('code');
        if (!pre || !code) continue;
        
        const language = getLanguage(pre, highlight);
        const blockType = getBlockType(language);
        
        // check for ```bash command followed by ```bash output
        if (blockType.type === 'command') {
            const nextHighlight = highlightArray[i + 1];
            if (nextHighlight) {
                const nextPre = nextHighlight.querySelector('pre');
                if (nextPre) {
                    const nextLang = getLanguage(nextPre, nextHighlight);
                    const nextBlockType = getBlockType(nextLang);
                    
                    if (nextBlockType.type === 'output') {
                        // Merge command and output into single terminal block
                        const nextCode = nextHighlight.querySelector('code');
                        enhanceTerminalBlockWithOutput(highlight, pre, code, nextCode);
                        
                        // Mark both as enhanced and hide the output block
                        highlight.classList.add('enhanced');
                        nextHighlight.classList.add('enhanced');
                        nextHighlight.style.display = 'none';
                        i++; // Skip the next block since we've processed it
                        continue;
                    }
                }
            }
            
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, 'bash', true);
            continue;
        }
        
        if (blockType.type === 'output') {
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, 'bash', false);
            continue;
        }
        
        if (isTerminalLanguage(blockType.baseLang)) {
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, blockType.baseLang, true);
            continue;
        }

        // normal non-terminal code block
        highlight.classList.add('enhanced');
        enhanceCodeBlock(highlight, pre, code, blockType.baseLang);
    }
}

function getLanguage(pre, highlight) {
    const dataLang = highlight.getAttribute('data-language');
    if (dataLang) return dataLang;
    
    const classMatch = pre.className.match(/language-([^\s]+)/);
    return classMatch ? classMatch[1] : 'text';
}

function getBlockType(language) {
    const lang = language.toLowerCase();
    
    if (lang.endsWith('command') || lang.endsWith('cmd')) {
        const baseLang = lang.replace(/command$|cmd$/, '') || 'bash';
        return { baseLang, type: 'command' };
    }
    if (lang.endsWith('output') || lang.endsWith('out')) {
        const baseLang = lang.replace(/output$|out$/, '') || 'bash';
        return { baseLang, type: 'output' };
    }
    
    const parts = lang.split(/[\s-]+/);
    if (parts.length > 1) {
        const baseLang = parts[0];
        if (parts.includes('command') || parts.includes('cmd')) {
            return { baseLang, type: 'command' };
        }
        if (parts.includes('output') || parts.includes('out')) {
            return { baseLang, type: 'output' };
        }
    }
    
    return { baseLang: lang, type: 'normal' };
}

function isTerminalLanguage(lang) {
    const terminalLangs = ['shell', 'bash', 'sh', 'zsh', 'terminal', 'console'];
    return terminalLangs.includes(lang.toLowerCase());
}

function enhanceTerminalBlockWithOutput(highlight, pre, commandCode, outputCode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-block';
    
    const header = document.createElement('div');
    header.className = 'terminal-header';
    header.innerHTML = `
        <div class="terminal-buttons">
            <span class="terminal-btn red"></span>
            <span class="terminal-btn yellow"></span>
            <span class="terminal-btn green"></span>
        </div>
        <span class="terminal-title">Terminal — Bash</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'terminal-content';
    
    const commandText = commandCode.textContent || commandCode.innerText;
    const commandLines = commandText.split('\n').filter(line => line.trim().length > 0);
    
    commandLines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'terminal-line command';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'terminal-copy-btn';
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            copyToClipboard(line, copyBtn);
        };
        
        lineDiv.innerHTML = `<span class="terminal-prompt">$</span><span class="terminal-command">${escapeHtml(line)}</span>`;
        lineDiv.appendChild(copyBtn);
        content.appendChild(lineDiv);
    });
    
    if (outputCode) {
        const outputText = outputCode.textContent || outputCode.innerText;
        const outputLines = outputText.split('\n');
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-line output';
        outputDiv.innerHTML = `<span class="terminal-output">${escapeHtml(outputText)}</span>`;
        content.appendChild(outputDiv);
    }
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    highlight.innerHTML = '';
    highlight.appendChild(wrapper);
}

function enhanceTerminalBlock(highlight, pre, code, language, isCommand = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-block';
    
    const header = document.createElement('div');
    header.className = 'terminal-header';
    header.innerHTML = `
        <div class="terminal-buttons">
            <span class="terminal-btn red"></span>
            <span class="terminal-btn yellow"></span>
            <span class="terminal-btn green"></span>
        </div>
        <span class="terminal-title">Terminal — Bash</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'terminal-content';
    
    const codeText = code.textContent || code.innerText;
    const lines = codeText.split('\n').filter(line => line.trim().length > 0);
    
    if (isCommand) {
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'terminal-line command';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'terminal-copy-btn';
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                copyToClipboard(line, copyBtn);
            };
            
            lineDiv.innerHTML = `<span class="terminal-prompt">$</span><span class="terminal-command">${escapeHtml(line)}</span>`;
            lineDiv.appendChild(copyBtn);
            content.appendChild(lineDiv);
        });
    } else {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-line output';
        outputDiv.innerHTML = `<span class="terminal-output">${escapeHtml(codeText)}</span>`;
        content.appendChild(outputDiv);
    }
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    highlight.innerHTML = '';
    highlight.appendChild(wrapper);
}

function enhanceCodeBlock(highlight, pre, code, language) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    
    const header = document.createElement('div');
    header.className = 'code-header';
    
    const langLabel = document.createElement('div');
    langLabel.className = 'code-language';
    langLabel.innerHTML = `<span class="code-dot"></span><span>${language.toUpperCase()}</span>`;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>COPY</span>`;
    copyBtn.onclick = () => {
        const codeText = code.textContent || code.innerText;
        copyToClipboard(codeText, copyBtn);
    };
    
    header.appendChild(langLabel);
    header.appendChild(copyBtn);
    
    const content = document.createElement('div');
    content.className = 'code-content';
    content.appendChild(pre.cloneNode(true));
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    highlight.innerHTML = '';
    highlight.appendChild(wrapper);
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = button.innerHTML;
        button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>${button.classList.contains('code-copy-btn') ? '<span>COPIED</span>' : ''}`;
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
