import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col relative overflow-x-hidden">
      <nav className="bg-surface/80 backdrop-blur-xl font-body-md text-body-md fixed top-0 w-full z-50 border-b border-outline-variant/30 flex justify-between items-center h-16 px-lg">
        <div className="flex items-center gap-sm cursor-pointer">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white">bolt</span>
          </div>
          <span className="font-headline-md text-headline-md font-bold text-primary ml-2">LLMForge</span>
        </div>
        <div className="hidden md:flex items-center gap-lg">
          <a className="text-on-surface-variant hover:text-white transition-colors hover:bg-surface-variant/50 duration-200 px-3 py-2 rounded-md" href="#features">Features</a>
          <a className="text-on-surface-variant hover:text-white transition-colors hover:bg-surface-variant/50 duration-200 px-3 py-2 rounded-md" href="#how-it-works">How it works</a>
          <a className="text-on-surface-variant hover:text-white transition-colors hover:bg-surface-variant/50 duration-200 px-3 py-2 rounded-md" href="#stack">Stack</a>
        </div>
        <div>
          <Link href="/login">
            <button className="bg-primary hover:bg-primary/90 text-white font-label-caps text-label-caps px-4 py-2 rounded-full transition-colors font-bold shadow-[0_0_15px_rgba(108,99,255,0.3)]">
              Get Started
            </button>
          </Link>
        </div>
      </nav>
      <main className="flex-grow pt-24 pb-xl z-10 relative">
        <section className="relative max-w-7xl mx-auto px-lg pt-xl pb-32 flex flex-col items-center text-center">
          <div className="absolute inset-0 bg-dot-pattern opacity-20 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-label-caps text-label-caps mb-8">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>v2.0 Beta Now Available</span>
          </div>
          <h1 className="font-display-lg text-display-lg md:text-[64px] md:leading-[72px] max-w-4xl mx-auto mb-6 tracking-tight">
            The missing layer between &quot;I have an LLM&quot; and <span className="text-primary border-b-4 border-primary pb-1">&quot;My LLM actually works&quot;</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 text-zinc-400">
            Stop battling brittle prompts and blind deployments. LLMForge provides the engineering console for production-grade pipelines, systematic evaluations, and real-time monitoring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <Link href="/login">
              <button className="bg-primary hover:bg-primary/90 text-white font-body-md text-body-md px-8 py-3 rounded-md transition-all font-bold shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:shadow-[0_0_30px_rgba(108,99,255,0.6)]">
                Get Started Free
              </button>
            </Link>
            <button className="bg-transparent border border-outline-variant hover:border-primary text-white font-body-md text-body-md px-8 py-3 rounded-md transition-all flex items-center justify-center gap-2 group">
              <span className="material-symbols-outlined group-hover:text-primary transition-colors">play_circle</span>
              See how it works
            </button>
          </div>
          <div className="relative w-full max-w-5xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur-xl opacity-50"></div>
            <div className="relative rounded-xl border border-outline-variant/50 bg-[#0e0d16] overflow-hidden shadow-2xl">
              <div className="h-8 bg-[#1b1b24] border-b border-outline-variant/30 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/50"></div>
                <div className="w-3 h-3 rounded-full bg-warning/50"></div>
                <div className="w-3 h-3 rounded-full bg-accent/50"></div>
              </div>
              <div className="w-full h-[500px] bg-card relative overflow-hidden">
                 <img src="https://lh3.googleusercontent.com/aida/AP1WRLsFStx0uhkfudh9i59cP7r39q8za96s2Nwo8xMtND-cuPsOB5WoxtQau8FJ3V_fSZx8gJ6yNOcflNPmcJrnfWv2RnjrGl0ydJWCjnv1S4RMGYtPtqzaxMg1qjgpYkQZdu__He_2jyDKRXuComho88VL1kMzBsjshNNOK2a1QXHyMoxpUmWrnFt4RxNOArkggFtVCLEBYkattNcCh31xxtobf0VLIf6Rp9BW9mkmfTUObptQkES927z8KBI" alt="LLMForge Dashboard Mockup" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-[#0e0d16] py-24 border-y border-outline-variant/20 relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-lg relative">
            <div className="text-center mb-16">
              <h2 className="font-headline-lg text-headline-lg mb-4 text-3xl font-bold">Building LLM apps is deceptively easy.</h2>
              <p className="font-body-md text-body-md text-zinc-400 max-w-2xl mx-auto">Scaling them to production is an engineering nightmare. We built the tooling to fix it.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 rounded-lg hover-glow transition-all duration-300 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20">
                  <span className="material-symbols-outlined">gpp_bad</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-xl font-bold">Hallucination Risks</h3>
                <p className="font-body-sm text-body-sm text-zinc-400">Unpredictable outputs and lack of factual grounding make deploying to enterprise clients a massive liability.</p>
              </div>
              <div className="glass-card p-6 rounded-lg hover-glow transition-all duration-300 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                  <span className="material-symbols-outlined">casino</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-xl font-bold">Prompt Guessing</h3>
                <p className="font-body-sm text-body-sm text-zinc-400">Endless cycles of tweaking prompts blindly without systematic regression testing or objective metrics.</p>
              </div>
              <div className="glass-card p-6 rounded-lg hover-glow transition-all duration-300 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                  <span className="material-symbols-outlined">visibility_off</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-xl font-bold">Production Blindness</h3>
                <p className="font-body-sm text-body-sm text-zinc-400">Once deployed, you have zero visibility into token costs, latency spikes, or subtle degradation in response quality.</p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-headline-md text-headline-md inline-block text-2xl font-semibold">
                <span className="text-white">LLMForge solves all three.</span>
                <span className="text-primary ml-2">Systematically.</span>
              </p>
            </div>
          </div>
        </section>
        <section className="py-24 max-w-7xl mx-auto px-lg" id="features">
          <div className="text-center mb-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-display-lg text-display-lg mb-4 text-4xl font-bold">Engineering-first platform</h2>
              <p className="font-body-lg text-body-lg text-zinc-400">Everything you need to orchestrate, evaluate, and monitor complex LLM workflows in one integrated environment.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-outline-variant/50 p-8 rounded-xl hover-glow transition-all duration-300 group">
              <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center text-primary mb-6 border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-[32px]">schema</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg mb-3 text-2xl font-bold">RAG Pipelines</h3>
              <p className="font-body-md text-body-md text-zinc-400 mb-6">Visually construct and manage complex Retrieval-Augmented Generation workflows. Connect vectors, chunking logic, and prompt templates seamlessly.</p>
            </div>
            <div className="bg-card border border-outline-variant/50 p-8 rounded-xl hover-glow transition-all duration-300 group">
              <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center text-primary mb-6 border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-[32px]">fact_check</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg mb-3 text-2xl font-bold">Eval Engine</h3>
              <p className="font-body-md text-body-md text-zinc-400 mb-6">Run deterministic and LLM-as-a-judge evaluations. Track faithfulness, answer relevancy, and context precision across versions.</p>
            </div>
            <div className="bg-card border border-outline-variant/50 p-8 rounded-xl hover-glow transition-all duration-300 group">
              <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center text-primary mb-6 border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-[32px]">science</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg mb-3 text-2xl font-bold">A/B Testing</h3>
              <p className="font-body-md text-body-md text-zinc-400 mb-6">Deploy shadow prompts to a subset of traffic. Compare performance, latency, and cost before rolling out to production.</p>
            </div>
            <div className="bg-card border border-outline-variant/50 p-8 rounded-xl hover-glow transition-all duration-300 group">
              <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center text-primary mb-6 border border-outline-variant group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-[32px]">monitoring</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg mb-3 text-2xl font-bold">Real-time Monitor</h3>
              <p className="font-body-md text-body-md text-zinc-400 mb-6">Observe your pipelines in the wild. Track token usage, catch latency spikes, and detect topic drift before users complain.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#0e0d16] font-body-sm text-body-sm w-full py-12 border-t border-outline-variant z-10 relative">
        <div className="max-w-7xl mx-auto px-lg flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-sm">
              <span className="font-headline-md text-headline-md font-bold text-primary">LLMForge</span>
            </div>
            <p className="text-zinc-500 max-w-xs">
              The engineering console for production-grade LLM applications.
            </p>
            <p className="text-zinc-600 mt-4">
              © 2026 LLMForge Engineering. All rights reserved.
            </p>
          </div>
          <div className="flex gap-12 text-zinc-400">
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white mb-2">Product</h4>
              <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#how-it-works" className="hover:text-primary transition-colors">How it works</Link>
              <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white mb-2">Resources</h4>
              <Link href="#" className="hover:text-primary transition-colors">Documentation</Link>
              <Link href="#" className="hover:text-primary transition-colors">Blog</Link>
              <Link href="#" className="hover:text-primary transition-colors">Support</Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-white mb-2">Legal</h4>
              <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
