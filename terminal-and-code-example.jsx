import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Terminal, 
  Calendar, 
  Clock, 
  ArrowLeft,
  Share2,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Command
} from 'lucide-react';

/**
 * Terminal Command Line Component
 * Includes individual copy functionality for the command only
 */
const TerminalCommandLine = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    const textArea = document.createElement("textarea");
    textArea.value = content;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="group flex items-start gap-3 py-1">
      <span className="text-red-500 font-bold select-none">$</span>
      <span className="flex-1 text-slate-100 break-all font-mono">{content}</span>
      <button 
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all text-slate-400 hover:text-white"
        title="Copy command"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

/**
 * Terminal Block Component
 * High-contrast, hacker-style terminal
 */
const TerminalBlock = ({ lines }) => {
  return (
    <div className="my-10 rounded-lg bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Terminal — Bash</span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-relaxed">
        {lines.map((line, idx) => (
          <div key={idx} className="mb-3 last:mb-0">
            {line.type === 'command' ? (
              <TerminalCommandLine content={line.content} />
            ) : (
              <div className="text-slate-500 pl-6 border-l border-white/5 ml-1.5 whitespace-pre-wrap">
                {line.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Enhanced Code Block
 */
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    document.body.removeChild(textArea);
  };

  return (
    <div className="my-10 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{language}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="text-xs font-bold text-slate-400 hover:text-black transition-colors flex items-center gap-2"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <div className="p-6 overflow-x-auto">
        <pre className="text-sm font-mono text-slate-800 leading-7">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const App = () => {
  const terminalData = [
    { type: 'command', content: 'curl -sSL https://hacked.codes/install.sh | bash' },
    { type: 'output', content: 'Checking environment... OK\nDownloading dependencies... [100%]\nConfiguring security headers... Done.' },
    { type: 'command', content: 'hacked --version' },
    { type: 'output', content: 'hacked-cli v2.4.0 (stable)' }
  ];

  const codeExample = `// Gatsby config for high-performance blogs
module.exports = {
  siteMetadata: {
    title: \`Hacked.Codes Replica\`,
    description: \`A high-contrast, minimalist dev blog.\`,
  },
  plugins: [
    \`gatsby-plugin-react-helmet\`,
    \`gatsby-plugin-postcss\`,
    {
      resolve: \`gatsby-source-filesystem\`,
      options: { name: \`images\`, path: \`\${__dirname}/src/images\` },
    },
  ],
}`;

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="#" className="text-2xl font-black tracking-tighter uppercase">
              Hacked<span className="text-red-600">.</span>Codes
            </a>
            <div className="hidden md:flex gap-8 text-[13px] font-bold uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-black transition-colors">Writeups</a>
              <a href="#" className="hover:text-black transition-colors">Archive</a>
              <a href="#" className="hover:text-black transition-colors">Tools</a>
            </div>
          </div>
          <button className="bg-black text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all rounded">
            Connect
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Meta Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-red-600 mb-6">
            <span>Security Writeup</span>
            <span className="w-8 h-[1px] bg-slate-200"></span>
            <span className="text-slate-400 font-medium">15 Min Read</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.95] mb-10 uppercase">
            Exploiting SSR <br/> 
            <span className="text-slate-300">In Modern Frameworks</span>
          </h1>

          <div className="flex items-center gap-6 py-8 border-y border-slate-100">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full border-4 border-white bg-black flex items-center justify-center text-white text-xs font-bold">HC</div>
            </div>
            <div>
              <p className="text-sm font-black uppercase">Root Admin</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">January 24, 2024</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <article className="prose prose-lg max-w-none">
          <p className="text-xl leading-relaxed font-medium text-slate-800 mb-10">
            Server-Side Rendering (SSR) has become the gold standard for performance. However, misconfigured hydration can lead to critical data leakage. Let's look at the bash installation process.
          </p>

          <h2 className="text-2xl font-black uppercase tracking-tight mt-16 mb-6">Environment Setup</h2>
          <p className="text-slate-600 mb-8">
            Run the following commands to initialize your security sandbox. Note that you can copy each command individually by hovering over the line.
          </p>

          <TerminalBlock lines={terminalData} />

          <h2 className="text-2xl font-black uppercase tracking-tight mt-16 mb-6">The Vulnerability</h2>
          <p className="text-slate-600 mb-8">
            Below is an example of how a typical Gatsby configuration might look before we apply the hardening patches.
          </p>

          <CodeBlock language="javascript" code={codeExample} />

          <div className="my-16 p-8 bg-slate-50 border-l-8 border-red-600">
            <h4 className="text-sm font-black uppercase tracking-widest mb-3">Critical Warning</h4>
            <p className="text-slate-700 italic font-medium leading-relaxed">
              "Never expose your internal API endpoints via <code>siteMetadata</code> as they are bundled into the public client-side JavaScript."
            </p>
          </div>

          <p className="text-slate-600">
            The solution involves moving these sensitive configurations to server-only environment variables and utilizing Gatsby's <code>onPreInit</code> lifecycle hooks to validate them before the build proceeds.
          </p>
        </article>

        {/* Post Footer */}
        <div className="mt-24 pt-10 border-t-2 border-black flex flex-wrap justify-between items-center gap-8">
          <div className="flex gap-4">
            {['#security', '#gatsby', '#react', '#javascript'].map(tag => (
              <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 cursor-pointer">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-6">
             <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-red-600 transition-colors">
               <Share2 size={16} /> Share
             </button>
             <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-red-600 transition-colors">
               <Bookmark size={16} /> Save
             </button>
          </div>
        </div>

        {/* Simple Red Newsletter Section */}
        <section className="mt-32 p-12 bg-red-600 text-white rounded-lg">
          <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Stay Armed.</h3>
          <p className="font-bold opacity-80 mb-8 uppercase text-sm tracking-widest">Weekly security insights delivered to your terminal.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder="YOUR@EMAIL.COM" 
              className="flex-1 bg-white/10 border-2 border-white/20 px-6 py-3 font-bold placeholder:text-white/40 focus:outline-none focus:border-white rounded"
            />
            <button className="bg-white text-red-600 px-8 py-3 font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded">
              Join
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white py-20 mt-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter">Hacked<span className="text-red-600">.</span>Codes</h2>
            <p className="max-w-xs text-slate-500 font-bold text-xs leading-loose uppercase tracking-wider">
              Investigating the intersections of security, web architecture, and privacy in the modern era.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-16">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6">Links</h4>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Github</a></li>
                <li><a href="#" className="hover:text-white transition-colors">RSS</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6">Legal</h4>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;