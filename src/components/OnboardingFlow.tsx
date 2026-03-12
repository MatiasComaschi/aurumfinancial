import { useState } from 'react';
import { Sparkles, Shield, Brain } from 'lucide-react';
import PlaidLinkButton from './PlaidLinkButton';

interface OnboardingFlowProps {
  currentStep: number;
  onPlaidSuccess: (publicToken: string, metadata: any) => void;
  onComplete: () => void;
  onStepChange: (step: number) => void;
}

export default function OnboardingFlow({ currentStep, onPlaidSuccess, onComplete, onStepChange }: OnboardingFlowProps) {
  const handlePlaidSuccess = (publicToken: string, metadata: any) => {
    onPlaidSuccess(publicToken, metadata);
    onStepChange(3);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {currentStep === 1 && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-heading text-primary">Aurum</h1>
              <p className="text-lg font-body text-foreground">
                Your money, finally making sense.
              </p>
            </div>
            <button
              onClick={() => onStepChange(2)}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-heading text-lg transition-all hover:opacity-90"
            >
              Let's get started
            </button>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-secondary" />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-heading text-foreground">Connect your bank</h2>
              <p className="text-sm font-body text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
                We use Plaid — the same technology trusted by millions of apps. We can read your transactions but we can never move your money.
              </p>
            </div>
            <div className="flex justify-center">
              <PlaidLinkButton onSuccess={handlePlaidSuccess} />
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="w-2 h-2 rounded-full bg-secondary" />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-heading text-foreground">Here's how Aurum works</h2>
              <p className="text-sm font-body text-muted-foreground">Three things that make it different.</p>
            </div>
            <div className="space-y-3">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="text-sm font-heading text-foreground mb-1">See the full picture</h3>
                    <p className="text-xs font-body text-muted-foreground leading-relaxed">
                      Your spending, bills, and balances in one place.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="text-sm font-heading text-foreground mb-1">Get real advice</h3>
                    <p className="text-xs font-body text-muted-foreground leading-relaxed">
                      Tap Analyze anytime for a plain English breakdown of your finances.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h3 className="text-sm font-heading text-foreground mb-1">It learns you</h3>
                    <p className="text-xs font-body text-muted-foreground leading-relaxed">
                      Tell it your goals in the Ask tab and it remembers them forever.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-heading text-lg flex items-center justify-center gap-2 transition-all hover:opacity-90"
            >
              <Sparkles className="w-5 h-5" />
              Take me to my finances
            </button>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
