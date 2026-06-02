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
        
        // check for ```bash command - collect all consecutive command/output pairs
        if (blockType.type === 'command') {
            const pairs = [];
            let j = i;
            let lastHighlight = null;
            
            while (j < highlightArray.length) {
                const currentHighlight = highlightArray[j];
                if (currentHighlight.classList.contains('enhanced')) break;
                
                // Check if there's content between this and the last highlight
                if (lastHighlight && !areAdjacent(lastHighlight, currentHighlight)) {
                    break;
                }
                
                const currentPre = currentHighlight.querySelector('pre');
                const currentCode = currentHighlight.querySelector('code');
                if (!currentPre || !currentCode) break;
                
                const currentLang = getLanguage(currentPre, currentHighlight);
                const currentBlockType = getBlockType(currentLang);
                
                if (currentBlockType.type === 'command') {
                    const pair = { commandCode: currentCode, outputCode: null, highlights: [currentHighlight] };
                    
                    // Check if next block is output and adjacent
                    const nextHighlight = highlightArray[j + 1];
                    if (nextHighlight && !nextHighlight.classList.contains('enhanced') && areAdjacent(currentHighlight, nextHighlight)) {
                        const nextPre = nextHighlight.querySelector('pre');
                        if (nextPre) {
                            const nextLang = getLanguage(nextPre, nextHighlight);
                            const nextBlockType = getBlockType(nextLang);
                            
                            if (nextBlockType.type === 'output') {
                                const nextCode = nextHighlight.querySelector('code');
                                pair.outputCode = nextCode;
                                pair.highlights.push(nextHighlight);
                                lastHighlight = nextHighlight;
                                j++; // Skip the output block
                            }
                        }
                    }
                    
                    pairs.push(pair);
                    if (!lastHighlight) lastHighlight = currentHighlight;
                    else lastHighlight = pair.highlights[pair.highlights.length - 1];
                    j++;
                } else {
                    break;
                }
            }
            
            if (pairs.length > 0) {
                enhanceTerminalBlockWithPairs(highlight, pairs, blockType);
                
                // Mark all collected blocks as enhanced and hide non-first ones
                pairs.forEach((pair, pairIndex) => {
                    pair.highlights.forEach((h, hIndex) => {
                        h.classList.add('enhanced');
                        if (pairIndex > 0 || hIndex > 0) {
                            h.style.display = 'none';
                        }
                    });
                });
                
                i = j - 1; // Skip all processed blocks
                continue;
            }
            
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, blockType, true);
            continue;
        }
        
        if (blockType.type === 'output') {
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, blockType, false);
            continue;
        }
        
        if (isTerminalLanguage(blockType.baseLang)) {
            highlight.classList.add('enhanced');
            enhanceTerminalBlock(highlight, pre, code, blockType, true);
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
    const trimmedLanguage = (language || '').trim();
    const lang = trimmedLanguage.toLowerCase();

    const terminalMatch = trimmedLanguage.match(/^(.*?)(?:[-\s])?(command|cmd|output|out)(?:\s+(.*))?$/i);
    if (terminalMatch) {
        const baseLang = terminalMatch[1].trim() || 'bash';
        const typeToken = terminalMatch[2].toLowerCase();
        const modifiers = parseTerminalModifiers(terminalMatch[3] || '');
        return {
            baseLang,
            type: typeToken === 'output' || typeToken === 'out' ? 'output' : 'command',
            promptOverride: modifiers.promptOverride,
            headerOverride: modifiers.headerOverride,
        };
    }

    return {
        baseLang: lang || 'text',
        type: 'normal',
        promptOverride: null,
        headerOverride: null,
    };
}

function parseTerminalModifiers(modifiersText) {
    const modifiers = (modifiersText || '').trim();
    if (!modifiers) {
        return { promptOverride: null, headerOverride: null };
    }

    const parts = modifiers.split(/\s+/).filter(Boolean);
    const promptToken = parts[0] || '';

    if (promptToken === '$') {
        return {
            promptOverride: null,
            headerOverride: parts.slice(1).join(' ').trim() || null,
        };
    }

    return {
        promptOverride: promptToken && promptToken !== '$' ? promptToken : null,
        headerOverride: parts.slice(1).join(' ').trim() || null,
    };
}

function getTerminalHeaderText(blockType) {
    const typeText = blockType.headerOverride?.toUpperCase() || blockType?.baseLang?.toUpperCase();
    return `Terminal - ${typeText}`;
}

function isTerminalLanguage(lang) {
    const terminalLangs = ['shell', 'bash', 'sh', 'zsh', 'terminal', 'console'];
    return terminalLangs.includes(lang.toLowerCase());
}

function areAdjacent(elem1, elem2) {
    let current = elem1.nextSibling;
    let whitespace = '';
    
    while (current && current !== elem2) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            return false;
        }
        if (current.nodeType === Node.TEXT_NODE) {
            if (current.textContent.trim() !== '') {
                return false;
            }
            whitespace += current.textContent;
        }
        current = current.nextSibling;
    }
    
    if (current !== elem2) return false;
    
    // Check if there's a blank line (2+ consecutive newlines) between elements
    const newlineCount = (whitespace.match(/\n/g) || []).length;
    return newlineCount <= 1;
}

function lineEndsWithShellContinuation(line) {
    return /\\\s*$/.test(line);
}

function groupCommandsByIndentation(lines) {
    const commands = [];
    let currentCommand = null;
    let shellBlockDepth = 0;
    
    const shellBlockStart = /\b(do|then|else|\{)\s*$/;
    const shellBlockEnd = /^(done|fi|esac|\})\b/;
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        // Strip trailing `\` so `do \` / `then \` still register as block starters
        const lineForStructure = trimmedLine.replace(/\\\s*$/, '');
        const isIndented = /^[\s\t]/.test(line);
        const startsBlock = shellBlockStart.test(lineForStructure);
        const endsBlock = shellBlockEnd.test(lineForStructure);
        
        if (shellBlockDepth > 0) {
            currentCommand.lines.push(line);
            currentCommand.fullText += '\n' + line;
            
            if (startsBlock) {
                shellBlockDepth++;
            }
            if (endsBlock) {
                shellBlockDepth--;
                if (shellBlockDepth === 0) {
                    commands.push(currentCommand);
                    currentCommand = null;
                }
            }
        } else if (
            currentCommand &&
            currentCommand.lines.length > 0 &&
            lineEndsWithShellContinuation(currentCommand.lines[currentCommand.lines.length - 1])
        ) {
            currentCommand.lines.push(line);
            currentCommand.fullText += '\n' + line;
            if (startsBlock) {
                shellBlockDepth++;
            }
            if (endsBlock && shellBlockDepth > 0) {
                shellBlockDepth--;
                if (shellBlockDepth === 0) {
                    commands.push(currentCommand);
                    currentCommand = null;
                }
            }
        } else if (!isIndented) {
            if (currentCommand) {
                commands.push(currentCommand);
            }
            currentCommand = { lines: [line], fullText: line };
            
            if (startsBlock) {
                shellBlockDepth = 1;
            }
        } else if (currentCommand) {
            currentCommand.lines.push(line);
            currentCommand.fullText += '\n' + line;
        } else {
            currentCommand = { lines: [line], fullText: line };
        }
    });
    
    if (currentCommand) {
        commands.push(currentCommand);
    }
    
    return commands;
}

function enhanceTerminalBlockWithPairs(highlight, pairs, blockType) {
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
        <span class="terminal-title">${escapeHtml(getTerminalHeaderText(blockType))}</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'terminal-content';
    
    pairs.forEach(pair => {
        renderCommandWithOutput(content, pair.commandCode, pair.outputCode, blockType);
    });
    
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    highlight.innerHTML = '';
    highlight.appendChild(wrapper);
}

function renderCommandWithOutput(content, commandCode, outputCode, blockType) {
    const commandText = commandCode.textContent || commandCode.innerText;
    const commandLines = commandText.split('\n').filter(line => line.trim().length > 0);
    const groupedCommands = groupCommandsByIndentation(commandLines);
    
    groupedCommands.forEach(command => {
        const commandWrapper = document.createElement('div');
        commandWrapper.className = 'terminal-command-group';
        
        command.lines.forEach((line, lineIndex) => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'terminal-line command';
            
            const isFirstLine = lineIndex === 0;
            
            if (isFirstLine) {
                const promptText = blockType.promptOverride || '$';
                lineDiv.innerHTML = `<span class="terminal-prompt">${escapeHtml(promptText)}</span><span class="terminal-command">${escapeHtml(line)}</span>`;
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'terminal-copy-btn';
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    copyToClipboard(command.fullText, copyBtn);
                };
                lineDiv.appendChild(copyBtn);
            } else {
                lineDiv.innerHTML = `<span class="terminal-prompt continuation"></span><span class="terminal-command continuation">${escapeHtml(line)}</span>`;
            }
            
            commandWrapper.appendChild(lineDiv);
        });
        
        content.appendChild(commandWrapper);
    });
    
    if (outputCode) {
        const outputText = outputCode.textContent || outputCode.innerText;
        const isIndented = /^[\s\t]/.test(outputText);
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-line output' + (isIndented ? ' indented' : '');
        outputDiv.innerHTML = `<span class="terminal-output">${escapeHtml(outputText)}</span>`;
        content.appendChild(outputDiv);
    }
}

function enhanceTerminalBlock(highlight, pre, code, blockType, isCommand = true) {
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
        <span class="terminal-title">${escapeHtml(getTerminalHeaderText(blockType))}</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'terminal-content';
    
    const codeText = code.textContent || code.innerText;
    const lines = codeText.split('\n').filter(line => line.trim().length > 0);
    
    if (isCommand) {
        const groupedCommands = groupCommandsByIndentation(lines);
        
        groupedCommands.forEach(command => {
            const commandWrapper = document.createElement('div');
            commandWrapper.className = 'terminal-command-group';
            
            command.lines.forEach((line, lineIndex) => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'terminal-line command';
                
                const isFirstLine = lineIndex === 0;
                
                if (isFirstLine) {
                    const promptText = blockType.promptOverride || '$';
                    lineDiv.innerHTML = `<span class="terminal-prompt">${escapeHtml(promptText)}</span><span class="terminal-command">${escapeHtml(line)}</span>`;
                    
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'terminal-copy-btn';
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    copyBtn.onclick = (e) => {
                        e.stopPropagation();
                        copyToClipboard(command.fullText, copyBtn);
                    };
                    lineDiv.appendChild(copyBtn);
                } else {
                    lineDiv.innerHTML = `<span class="terminal-prompt continuation"></span><span class="terminal-command continuation">${escapeHtml(line)}</span>`;
                }

                commandWrapper.appendChild(lineDiv);
            });
            
            content.appendChild(commandWrapper);
        });
    } else {
        const isIndented = /^[\s\t]/.test(codeText);
        
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-line output' + (isIndented ? ' indented' : '');
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
