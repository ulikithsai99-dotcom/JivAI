import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ParticleBackground } from "./ParticleBackground";
import { Mic, Activity, AlertTriangle, Shield, CheckCircle, ChevronRight, Volume2, Phone, MapPin, X, User, Users } from "lucide-react";
import { useAnalyzeEmergency, useGetGuidance, useListHelplines, useHealthCheck, useListCategories, getHealthCheckQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import type { EmergencyAnalysis } from "@workspace/api-client-react";

// --- STATE MACHINE TYPES ---
type AppState = "home" | "listening" | "processing" | "actionMode" | "guidedResponse";

// --- MAIN CONTAINER ---
export function JivAIApp() {
  const [state, setState] = useState<AppState>("home");
  const [analysisResult, setAnalysisResult] = useState<EmergencyAnalysis | null>(null);

  // Use health check and categories in background to warm up API and comply with requirements
  useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: Infinity } });
  useListCategories({ query: { queryKey: getListCategoriesQueryKey(), staleTime: Infinity } });

  // Transitions
  const handleStartListening = () => setState("listening");
  const handleListeningComplete = () => {
    setState("processing");
  };
  const handleProcessingComplete = (result: EmergencyAnalysis) => {
    setAnalysisResult(result);
    setState("actionMode");
  };
  const handleGoToGuidedResponse = () => setState("guidedResponse");
  const handleBackToAction = () => setState("actionMode");
  const handleReset = () => {
    setState("home");
    setAnalysisResult(null);
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <ParticleBackground />
      
      <div className="relative z-10 w-full h-full min-h-[100dvh] flex flex-col">
        <AnimatePresence mode="wait">
          {state === "home" && (
            <HomeScreen key="home" onStart={handleStartListening} />
          )}
          {state === "listening" && (
            <ListeningScreen key="listening" onComplete={handleListeningComplete} />
          )}
          {state === "processing" && (
            <ProcessingScreen 
              key="processing" 
              transcript="My father collapsed and he is clutching his chest. I think he is having a heart attack."
              onComplete={handleProcessingComplete} 
            />
          )}
          {state === "actionMode" && analysisResult && (
            <ActionModeScreen 
              key="action" 
              analysis={analysisResult} 
              onGuide={handleGoToGuidedResponse}
              onReset={handleReset}
            />
          )}
          {state === "guidedResponse" && analysisResult && (
            <GuidedResponseScreen 
              key="guide" 
              category={analysisResult.category} 
              onBack={handleBackToAction} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- SCREEN 1: HOME ---
function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center flex-1 w-full h-full px-6"
    >
      <div className="absolute top-12 left-0 right-0 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">JivAI</h1>
        </div>
        <p className="mt-2 text-sm font-medium tracking-widest text-primary uppercase opacity-80">
          From Panic To Action
        </p>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto mt-20">
        <button
          onClick={onStart}
          className="relative group flex items-center justify-center w-64 h-64 rounded-full bg-card border border-primary/20 hover:bg-card/80 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/30 mic-glow"
          aria-label="Start recording emergency"
        >
          {/* Animated glow rings */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 mic-pulse-ring" />
          <div className="absolute inset-[-20px] rounded-full border border-primary/10 mic-pulse-ring" style={{ animationDelay: "1s" }} />
          <div className="absolute inset-[-40px] rounded-full border border-primary/5 mic-pulse-ring" style={{ animationDelay: "2s" }} />
          
          <Mic className="w-24 h-24 text-primary group-hover:scale-110 transition-transform duration-300 relative z-10" />
        </button>

        <p className="mt-12 text-2xl font-medium text-white/90">
          Tell me what happened.
        </p>
      </div>
    </motion.div>
  );
}

// --- SCREEN 2: ACTIVE LISTENING ---
function ListeningScreen({ onComplete }: { onComplete: () => void }) {
  const [transcript, setTranscript] = useState("");
  const demoText = "My father collapsed and he is clutching his chest. I think he is having a heart attack.";
  
  useEffect(() => {
    let currentIndex = 0;
    const words = demoText.split(" ");
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setTranscript(prev => prev + (prev ? " " : "") + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 1500); // Wait a beat after finishing
      }
    }, 300); // speed of word appearance

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center flex-1 w-full h-full px-6 max-w-3xl mx-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Waveform Visualization Fake */}
        <div className="flex items-center gap-1 h-24 mb-16">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 rounded-full bg-primary"
              animate={{ 
                height: ["10%", "100%", "10%", "60%", "10%"] 
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </div>

        <div className="w-full text-center">
          <p className="text-3xl md:text-5xl font-medium leading-tight text-white min-h-[120px]">
            {transcript}
            <motion.span 
              animate={{ opacity: [1, 0] }} 
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block ml-2 w-3 h-8 bg-primary align-middle"
            />
          </p>
        </div>
      </div>
      
      <div className="pb-12 text-center">
        <p className="text-xl text-primary font-medium flex items-center gap-2">
          <Activity className="w-6 h-6" /> Listening closely...
        </p>
      </div>
    </motion.div>
  );
}

// --- SCREEN 3: PROCESSING ---
function ProcessingScreen({ transcript, onComplete }: { transcript: string, onComplete: (result: EmergencyAnalysis) => void }) {
  const analyzeMutation = useAnalyzeEmergency();
  const analyzeRef = useRef(analyzeMutation.mutate);
  analyzeRef.current = analyzeMutation.mutate;

  useEffect(() => {
    // Artificial delay to ensure user sees the "Understanding" state and feels calm
    const timer = setTimeout(() => {
      analyzeRef.current(
        { data: { transcript } },
        {
          onSuccess: (data) => {
            onComplete(data);
          },
          onError: () => {
            // Fallback for demo if API fails
            onComplete({
              category: "medical",
              urgency: "critical",
              title: "MEDICAL EMERGENCY DETECTED",
              summary: "We have detected a possible cardiac event. Emergency services are required immediately.",
              actions: [
                { id: "1", label: "CALL NOW", icon: "phone", type: "call", phoneNumber: "911" },
                { id: "2", label: "NEAREST HELP", icon: "map-pin", type: "locate" },
                { id: "3", label: "VOICE GUIDE", icon: "mic", type: "guide" }
              ],
              guidanceSteps: [],
              helplines: []
            });
          }
        }
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [transcript, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center flex-1 w-full h-full"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="relative w-32 h-32"
      >
        <div className="absolute inset-0 border-t-2 border-l-2 border-primary rounded-full opacity-70" />
        <div className="absolute inset-2 border-b-2 border-r-2 border-primary/50 rounded-full" />
      </motion.div>
      <h2 className="mt-10 text-2xl font-medium text-white tracking-wide">
        Understanding your situation...
      </h2>
    </motion.div>
  );
}

// --- SCREEN 4: ACTION MODE ---
function ActionModeScreen({ analysis, onGuide, onReset }: { analysis: EmergencyAnalysis, onGuide: () => void, onReset: () => void }) {
  const [showHelplines, setShowHelplines] = useState(false);

  // Parse urgency color
  const urgencyColor = analysis.urgency === "critical" || analysis.urgency === "high" 
    ? "bg-destructive text-destructive-foreground" 
    : "bg-orange-500 text-white";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col flex-1 w-full max-w-md mx-auto px-4 py-8 md:max-w-2xl md:py-12"
    >
      <div className="flex justify-between items-start mb-8">
        <button onClick={onReset} className="text-muted-foreground hover:text-white p-2" aria-label="Cancel">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8">
        {/* Status Badge */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`px-6 py-2 rounded-full font-bold tracking-widest text-sm flex items-center gap-2 ${urgencyColor} animate-in fade-in zoom-in`}>
            <AlertTriangle className="w-5 h-5" />
            {analysis.title.toUpperCase() || "EMERGENCY DETECTED"}
          </div>

          {/* Subject context — inferred person details */}
          {analysis.subjectContext && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              {analysis.subjectContext.estimatedGender === "male" ? (
                <User className="w-4 h-4 text-primary shrink-0" />
              ) : analysis.subjectContext.estimatedGender === "female" ? (
                <User className="w-4 h-4 text-pink-400 shrink-0" />
              ) : (
                <Users className="w-4 h-4 text-white/50 shrink-0" />
              )}
              <span className="text-sm text-white/70">
                Patient likely{" "}
                <span className="text-white font-semibold capitalize">
                  {analysis.subjectContext.estimatedGender === "unknown"
                    ? "unknown gender"
                    : analysis.subjectContext.estimatedGender}
                </span>
                {analysis.subjectContext.estimatedAgeRange !== "unknown" && (
                  <>
                    {", "}
                    <span className="text-white font-semibold">
                      {analysis.subjectContext.estimatedAgeRange}
                    </span>
                  </>
                )}
                {" "}
                <span className="text-white/40 text-xs">
                  (based on "{analysis.subjectContext.relationship}")
                </span>
              </span>
            </motion.div>
          )}

          <p className="text-xl text-white/90 max-w-lg">
            {analysis.summary}
          </p>
        </div>

        {/* Action Buttons Cockpit */}
        <div className="flex flex-col gap-4 mt-4">
          <button 
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-destructive hover:bg-destructive/90 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,77,77,0.3)] border border-destructive/50 min-h-[100px]"
            onClick={() => window.open(`tel:911`)}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold text-white uppercase">Call Now</span>
                <span className="block text-white/80 font-medium">Emergency Services</span>
              </div>
            </div>
            <ChevronRight className="w-8 h-8 text-white/50" />
          </button>

          <button 
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-card hover:bg-card/80 border border-primary/20 active:scale-95 transition-all min-h-[100px]"
            onClick={() => setShowHelplines(true)}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold text-white uppercase">Nearest Help</span>
                <span className="block text-white/60 font-medium">Facilities & Helplines</span>
              </div>
            </div>
            <ChevronRight className="w-8 h-8 text-primary/50" />
          </button>

          <button 
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-card hover:bg-card/80 border border-primary/20 active:scale-95 transition-all min-h-[100px]"
            onClick={onGuide}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Volume2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold text-white uppercase">Voice Guide</span>
                <span className="block text-white/60 font-medium">Step-by-step instructions</span>
              </div>
            </div>
            <ChevronRight className="w-8 h-8 text-primary/50" />
          </button>
        </div>
      </div>

      {showHelplines && (
        <HelplinesSheet onClose={() => setShowHelplines(false)} category={analysis.category} />
      )}
    </motion.div>
  );
}

// --- SCREEN 5: GUIDED RESPONSE ---
function GuidedResponseScreen({ category, onBack }: { category: string, onBack: () => void }) {
  const { data: guidance, isLoading } = useGetGuidance(category, { query: { enabled: !!category, queryKey: ["guidance", category] } });
  const [currentStep, setCurrentStep] = useState(0);

  if (isLoading || !guidance) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = guidance.steps;
  const isLast = currentStep === steps.length - 1;

  // Fallback if empty
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        <p className="text-xl text-white">No specific guidance found.</p>
        <button onClick={onBack} className="mt-8 px-8 py-4 bg-card border border-primary/20 rounded-xl text-white font-bold text-xl min-h-[64px]">
          Return to Action Menu
        </button>
      </div>
    );
  }

  const step = steps[currentStep];

  // Map icon strings to Lucide components
  const IconComponent = step.icon === "heart" ? Activity : (step.icon === "shield" ? Shield : CheckCircle);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col flex-1 w-full max-w-3xl mx-auto px-4 py-8 md:py-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Stay Calm. Follow These Steps.</h2>
        <div className="px-4 py-2 bg-card border border-white/10 rounded-full font-bold text-white">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Main Step Content */}
      <div className="flex-1 flex flex-col justify-center py-12">
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-8"
        >
          <div className="w-32 h-32 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center text-primary mb-4 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
             <IconComponent className="w-16 h-16" />
          </div>
          <p className="text-4xl md:text-5xl font-medium text-white leading-tight">
            {step.instruction}
          </p>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 mt-auto">
        <button 
          onClick={() => isLast ? onBack() : setCurrentStep(c => c + 1)}
          className="w-full py-6 rounded-2xl bg-success hover:bg-success/90 active:scale-95 transition-all text-white font-bold text-2xl shadow-[0_0_20px_rgba(0,208,132,0.3)] min-h-[80px]"
        >
          {isLast ? "FINISHED" : "NEXT STEP"}
        </button>
        <button 
          onClick={onBack}
          className="w-full py-5 rounded-2xl bg-card hover:bg-card/80 border border-white/10 active:scale-95 transition-all text-white/80 font-bold text-xl min-h-[64px]"
        >
          I Need More Help
        </button>
      </div>
    </motion.div>
  );
}

// --- SUPPORTING: HELPLINES SHEET ---
function HelplinesSheet({ onClose, category }: { onClose: () => void, category: string }) {
  const { data: helplines, isLoading } = useListHelplines({ category }, { query: { queryKey: ["helplines", category] } });

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-50 h-[80vh] bg-card border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl"
    >
      <div className="flex justify-center p-4">
        <div className="w-16 h-1.5 bg-white/20 rounded-full" />
      </div>
      
      <div className="px-6 py-2 flex justify-between items-center border-b border-white/5 pb-4">
        <h3 className="text-2xl font-bold text-white">Emergency Helplines</h3>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : helplines?.length ? (
          helplines.map((helpline) => (
            <a 
              key={helpline.id}
              href={`tel:${helpline.number}`}
              className="flex items-center justify-between p-5 rounded-2xl bg-background border border-white/5 hover:border-primary/30 hover:bg-background/80 transition-all group min-h-[80px]"
            >
              <div>
                <h4 className="text-xl font-bold text-white">{helpline.name}</h4>
                <p className="text-primary font-mono text-lg mt-1">{helpline.number}</p>
                {helpline.description && <p className="text-sm text-white/50 mt-1">{helpline.description}</p>}
              </div>
              <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6 text-success" />
              </div>
            </a>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">No specific helplines found for this category.</p>
            <a href="tel:911" className="mt-6 inline-flex items-center justify-center px-8 py-4 bg-destructive text-white font-bold rounded-xl text-xl min-h-[64px]">
              Call 911 Default
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
