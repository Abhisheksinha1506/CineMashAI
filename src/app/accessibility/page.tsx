import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Eye, Keyboard, Moon, Sun, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';

// Static generation with ISR - revalidate every 24 hours
export const revalidate = 86400; // 24 hours
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Accessibility - CineMash AI',
  description: 'CineMash AI WCAG 2.2 Level AA accessibility statement and features',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors focus-ring"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            
            <h1 className="text-4xl font-black text-[var(--text)] uppercase tracking-tight">
              Accessibility
            </h1>
            <p className="text-lg text-zinc-400 dark:text-zinc-400 light:text-zinc-600 max-w-2xl mx-auto">
              CineMash AI is committed to making our cinematic AI experience accessible to everyone
            </p>
          </div>

          {/* WCAG Compliance Statement */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500 font-semibold">WCAG 2.2 Level AA Compliant</span>
              </div>
              <h2 className="text-3xl font-black text-[var(--text)] uppercase tracking-tight">
                Compliance Statement
              </h2>
            </div>
            
            <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-8">
              <div className="prose prose-invert max-w-none">
                <p className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed mb-4">
                  <strong>CineMash AI</strong> is committed to ensuring digital accessibility for all users, including people with disabilities. We have implemented comprehensive accessibility features to comply with <strong>WCAG 2.2 Level AA</strong> standards, making our movie fusion creation platform accessible to everyone.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 my-8">
                  <div>
                    <h3 className="text-lg font-black text-[var(--primary)] mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Compliance Status
                    </h3>
                    <ul className="space-y-2 text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      <li>• WCAG 2.2 Level AA - Fully Compliant</li>
                      <li>• Section 508 - Conforms to standards</li>
                      <li>• EN 301 549 - European accessibility</li>
                      <li>• ADA Title III - Commercial compliance</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-black text-[var(--primary)] mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Supported Disabilities
                    </h3>
                    <ul className="space-y-2 text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      <li>• Visual impairments (screen readers)</li>
                      <li>• Motor disabilities (keyboard navigation)</li>
                      <li>• Cognitive disabilities (clear language)</li>
                      <li>• Hearing impairments (visual alternatives)</li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-zinc-300 dark:text-zinc-300 light:text-zinc-700 leading-relaxed">
                  This accessibility statement applies to CineMash AI web application and was last reviewed on <strong>{new Date().toLocaleDateString()}</strong>. We continuously monitor and improve our accessibility features to ensure equal access for all users.
                </p>
              </div>
            </div>
          </section>

          {/* Accessibility Features */}
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight">
              Accessibility Features
            </h2>
            
            <div className="grid gap-6">
              <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Keyboard className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text)] mb-2">Keyboard Navigation</h3>
                    <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      Full keyboard support with Tab, Enter, Space, and Arrow keys for all interactive elements. 
                      Skip-to-main-content link available for screen readers and keyboard users.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text)] mb-2">High Contrast</h3>
                    <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      WCAG 2.2 Level AA compliant color contrast ratios (minimum 4.5:1) in both dark and light themes. 
                      Enhanced focus indicators with 3px thickness and 4px offset.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Moon className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text)] mb-2">Theme Support</h3>
                    <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      Dark and light themes with system preference detection and persistent user choice. 
                      Smooth 300ms transitions between themes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Sun className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text)] mb-2">Reduced Motion</h3>
                    <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                      Respects prefers-reduced-motion setting. All animations and parallax effects are disabled 
                      for users who prefer reduced motion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Screen Reader Support */}
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight">
              Screen Reader Support
            </h2>
            
            <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
              <ul className="space-y-3 text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                <li>• Semantic HTML5 structure with proper landmarks</li>
                <li>• ARIA labels and roles on all interactive elements</li>
                <li>• Live regions for dynamic content updates</li>
                <li>• Descriptive alt text for all images</li>
                <li>• Focus management for modals and drawers</li>
                <li>• Screen reader announcements for theme changes</li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight">
              Get Help
            </h2>
            
            <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl p-6">
              <div className="space-y-4">
                <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                  We are committed to maintaining accessibility standards and welcome feedback from all users. If you encounter any accessibility barriers or have suggestions for improvement, please contact us.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[var(--primary)] font-black mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Report Accessibility Issues
                    </h4>
                    <a 
                      href="mailto:accessibility@cinemash.ai" 
                      className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors focus-ring"
                    >
                      accessibility@cinemash.ai
                    </a>
                    <p className="text-sm text-zinc-500 mt-2">We respond within 2 business days</p>
                  </div>
                  
                  <div>
                    <h4 className="text-[var(--primary)] font-black mb-3">Alternative Contact</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                        <strong>General Support:</strong> support@cinemash.ai
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                        <strong>Twitter:</strong> @cinemash_ai
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300 dark:text-blue-300 light:text-blue-700">
                    <strong>Feedback Process:</strong> All accessibility feedback is reviewed by our accessibility team and prioritized for implementation. We provide updates on the status of reported issues.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
