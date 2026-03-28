'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, Film, Zap, Sparkles } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

interface DynamicGuideProps {
  currentPage: 'studio' | 'gallery';
  selectedMoviesCount?: number;
  isGenerating?: boolean | string;
  hasFusionResult?: boolean;
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
}

export function DynamicGuide({ 
  currentPage, 
  selectedMoviesCount = 0,
  isGenerating = false,
  hasFusionResult = false,
  isVisible = true,
  onVisibilityChange,
  className = ''
}: DynamicGuideProps) {
  const [internalVisible, setInternalVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const showGuide = isVisible !== undefined ? isVisible : internalVisible;
  const setShowGuide = onVisibilityChange || setInternalVisible;

  const studioSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Step 1: Pick Your Movies',
      description: 'Choose 2-4 films to create your fusion.',
      icon: <Film className="h-5 w-5" />,
      action: selectedMoviesCount === 0 ? 'Start selecting movies below' : undefined
    },
    {
      id: 'selecting',
      title: `Step 1: Pick Your Movies (${selectedMoviesCount}/4 selected)`,
      description: selectedMoviesCount < 2 
        ? `Select ${2 - selectedMoviesCount} more movie${2 - selectedMoviesCount > 1 ? 's' : ''} to continue`
        : selectedMoviesCount < 4 
          ? 'You can add more movies or start fusing'
          : 'Maximum movies selected. Ready to fuse!',
      icon: <Film className="h-5 w-5" />,
      action: selectedMoviesCount >= 2 && selectedMoviesCount <= 4 ? 'Ready to create your fusion!' : undefined
    },
    {
      id: 'ready',
      title: 'Step 2: Create Your Fusion',
      description: 'Click the FUSE NOW button to see the movie magic happen!',
      icon: <Zap className="h-5 w-5" />,
      action: 'Click the floating FUSE NOW button'
    },
    {
      id: 'generating',
      title: 'Creating Your Fusion...',
      description: 'The AI is working its movie magic. This usually takes 10-15 seconds.',
      icon: <Sparkles className="h-5 w-5 animate-pulse" />
    },
    {
      id: 'complete',
      title: 'Fusion Complete!',
      description: 'Your unique movie fusion is ready. You can save it, share it, or create a new one.',
      icon: <Sparkles className="h-5 w-5" />
    }
  ];

  const gallerySteps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to the Gallery',
      description: 'Browse amazing movie fusions created by the community. Vote for your favorites!',
      icon: <Film className="h-5 w-5" />
    },
    {
      id: 'explore',
      title: 'Explore Fusions',
      description: 'Scroll through the gallery to discover creative movie combinations. Click any fusion to see details.',
      icon: <Sparkles className="h-5 w-5" />
    },
    {
      id: 'interact',
      title: 'Get Involved',
      description: 'Vote up fusions you love, click "Remix" to build upon existing creations, or create your own!',
      icon: <ChevronRight className="h-5 w-5" />
    }
  ];

  const steps = currentPage === 'studio' ? studioSteps : gallerySteps;

  // Determine current step based on state
  useEffect(() => {
    if (currentPage === 'studio') {
      if (!!isGenerating) {
        setCurrentStep(3); // generating
      } else if (hasFusionResult) {
        setCurrentStep(4); // complete
      } else if (selectedMoviesCount === 0) {
        setCurrentStep(0); // welcome
      } else if (selectedMoviesCount >= 2 && selectedMoviesCount <= 4) {
        setCurrentStep(2); // ready
      } else {
        setCurrentStep(1); // selecting
      }
    } else {
      // Gallery - cycle through steps or show based on interaction
      setCurrentStep(0);
    }
  }, [currentPage, selectedMoviesCount, isGenerating, hasFusionResult]);

  // Auto-hide guide after user has progressed
  useEffect(() => {
    if (currentPage === 'studio' && selectedMoviesCount >= 2) {
      const timer = setTimeout(() => {
        setShowGuide(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [currentPage, selectedMoviesCount, setShowGuide]);

  const currentGuideStep = steps[currentStep];

  if (!currentGuideStep) return null;

  return (
    <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-20 right-4 z-30 w-80 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl ${className}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
                {currentGuideStep.icon}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{currentGuideStep.title}</h3>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <p className="text-white/80 text-sm leading-relaxed mb-3">
            {currentGuideStep.description}
          </p>

          {/* Action text */}
          {currentGuideStep.action && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--primary)] font-medium mb-3"
            >
              {currentGuideStep.action}
            </motion.div>
          )}

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 justify-center">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-[var(--primary)]' 
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
              className="text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Guide Button Component
export function GuideButton({ 
  onClick, 
  isVisible 
}: { 
  onClick: () => void; 
  isVisible: boolean; 
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`fixed top-20 right-4 z-30 p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 transition-all duration-300 ${
        isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:bg-black/80'
      }`}
    >
      <HelpCircle className="h-5 w-5 text-white/80 hover:text-white transition-colors" />
    </motion.button>
  );
}
