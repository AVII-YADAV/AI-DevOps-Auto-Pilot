'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { billingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { CreditCard, Rocket, CheckCircle2, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BillingPage() {
  const router = useRouter();

  // Load the live DB subscription tier of the user
  const { data, isLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => billingAPI.getStatus(),
  });

  const billingStatus = data?.data;

  const checkoutMutation = useMutation({
    mutationFn: () => billingAPI.checkout(),
    onSuccess: (res) => {
      // Directs window to Stripe Checkout natively
      window.location.href = res.data.url;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-500)' }} />
      </div>
    );
  }

  const isPro = billingStatus?.tier === 'pro';

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-10 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}
        >
          Billing & Usage
        </motion.h1>
        <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          Upgrade your deployment infrastructure to unlock enterprise resource allowances and unmetered AI debug assistance.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`card relative overflow-hidden flex flex-col ${!isPro ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : ''}`}
        >
          {!isPro && (
            <div className="absolute top-0 inset-x-0 h-1" style={{ background: 'var(--brand-500)' }} />
          )}
          <div className="p-6">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Free Sandbox</h3>
            <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>Perfect for side projects and debugging prototypes.</p>
            <div className="my-6">
              <span className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>$0</span>
              <span className="text-sm block mt-1" style={{ color: 'var(--text-tertiary)' }}>forever</span>
            </div>

            <ul className="space-y-4 mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Max 3 Concurrent Projects
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Basic Container Resources (512MB RAM)
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Community Support
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <AlertTriangle className="w-5 h-5" />
                Limited AI Error Suggestions
              </li>
            </ul>

            <div className="mt-auto">
              <button disabled className="btn-secondary w-full text-center py-3 opacity-50 cursor-not-allowed">
                {isPro ? 'Downgrade' : 'Current Plan'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Pro Tier */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`card relative overflow-hidden flex flex-col`}
          style={{
             background: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), var(--bg-primary)',
             borderColor: isPro ? '#a855f7' : 'var(--border-subtle)',
             boxShadow: isPro ? '0 10px 40px -10px rgba(168, 85, 247, 0.3)' : 'none'
          }}
        >
          <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }} />
          {isPro && (
            <div className="absolute top-6 right-6">
              <span className="text-xs px-3 py-1 font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ACTIVE
              </span>
            </div>
          )}
          
          <div className="p-6">
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              Pro Pilot
              <Rocket className="w-5 h-5 text-purple-400" />
            </h3>
            <p className="text-sm mt-2 text-purple-200/60">Unlock true production scaling and infinite AI limits.</p>
            <div className="my-6 block">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">$19</span>
              <span className="text-sm block mt-1 text-purple-200/50">per month, billed safely via Stripe.</span>
            </div>

            <ul className="space-y-4 mb-8 text-sm text-purple-100/80">
              <li className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-purple-400" />
                <strong>Unlimited Projects</strong> & Bandwidth
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                Up to 2GB RAM & 1 Core per Instance
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                Custom SSL Domain Binding
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                Infinite Automated AI Log Analyzing (GPT-4)
              </li>
            </ul>

            <div className="mt-auto pt-4 relative z-10">
              {isPro ? (
                <button 
                   className="btn-primary w-full text-center py-3 flex items-center justify-center gap-2"
                   style={{ background: 'var(--bg-tertiary)', color: 'white', borderColor: 'var(--border-subtle)' }}
                   onClick={() => window.location.href = 'https://billing.stripe.com/p/session/mock-portal'}
                >
                  <CreditCard className="w-4 h-4" /> Manage Subscription
                </button>
              ) : (
                <button 
                   onClick={() => checkoutMutation.mutate()}
                   disabled={checkoutMutation.isPending}
                   className="w-full text-center py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                   style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                >
                  {checkoutMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Upgrade to Pro'}
                </button>
              )}
            </div>
          </div>
          
          {/* Decorative Background Blob */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        </motion.div>
      </div>

    </div>
  );
}
