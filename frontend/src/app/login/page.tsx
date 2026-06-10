"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthContext";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const particleCount = 20;
    
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      
      const size = Math.random() * 4 + 1;
      const left = Math.random() * 100;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 10;
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${left}vw`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      
      container.appendChild(particle);
      
      particle.addEventListener('animationend', () => {
        particle.remove();
        createParticle();
      });
    };

    for (let i = 0; i < particleCount; i++) {
      createParticle();
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      toast.error(error.message || "Failed to log in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    try {
      setIsLoading(true);
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Successfully logged in!");
      }
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background">
      <div className="grid-overlay"></div>
      <div className="particle-container" id="particles"></div>
      <main className="relative z-10 w-full max-w-[420px] px-lg">
        <div className="bg-card/80 backdrop-blur-xl border border-outline-variant/50 rounded-xl p-12 flex flex-col items-center text-center glow-effect shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <div className="mb-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-md mb-4 flex items-center justify-center overflow-hidden border border-outline-variant bg-[#0e0d16] shadow-[0_0_15px_rgba(108,99,255,0.2)]">
               <span className="material-symbols-outlined text-primary text-4xl">bolt</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              LLMForge
            </h1>
            <p className="text-sm text-zinc-400 mt-2 tracking-wide font-mono">
              Build · Evaluate · Monitor LLMs
            </p>
          </div>
          
          <div className="w-full h-[1px] bg-outline-variant/30 my-8 relative"></div>
          
          <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col gap-2 text-left">
              <label className="text-sm font-medium text-zinc-300">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-md px-4 py-2.5 text-white outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2 text-left">
              <label className="text-sm font-medium text-zinc-300">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1f1f28] border border-[#1E1E2E] focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-md px-4 py-2.5 text-white outline-none transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant bg-[#1f1f28] checked:bg-primary accent-primary cursor-pointer"
                />
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Remember me</span>
              </label>
              
              {!isRegistering && (
                <a href="#" className="text-sm text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-md font-semibold transition-all shadow-[0_0_20px_rgba(108,99,255,0.3)] disabled:opacity-70"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (isRegistering ? "Create Account" : "Sign In")}
            </button>
          </form>

          <div className="w-full flex items-center gap-4 my-6 opacity-60">
            <div className="h-[1px] flex-1 bg-outline-variant"></div>
            <span className="text-xs text-zinc-400 uppercase tracking-widest">Or continue with</span>
            <div className="h-[1px] flex-1 bg-outline-variant"></div>
          </div>
          
          <div className="w-full flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              type="button"
              className="google-btn w-full flex items-center justify-center gap-4 py-3 px-6 bg-[#0e0d16] border border-outline-variant rounded-md transition-all duration-300 group hover:border-zinc-600"
            >
              {isLoading ? (
                 <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
              )}
              <span className="text-base font-semibold text-white">Google</span>
            </button>
            <p className="text-sm text-zinc-400 text-center mt-2">
              {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)} 
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isRegistering ? "Sign in" : "Register here"}
              </button>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            By continuing, you agree to our <br />
            <Link className="text-primary hover:text-primary/80 hover:underline transition-colors" href="#">Terms of Service</Link> and <Link className="text-primary hover:text-primary/80 hover:underline transition-colors" href="#">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
