import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { confidenceScoreForLevel, type ExperienceLevel } from "@/lib/experience";
import { formatPostgrestError } from "@/lib/supabase-errors";

type AgeGroup = "14-18" | "18+";

const experienceOptions: { value: ExperienceLevel; label: string; emoji: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱", desc: "Just starting out" },
  { value: "intermediate", label: "Intermediate", emoji: "📈", desc: "Some experience" },
  { value: "pro", label: "Pro", emoji: "🏆", desc: "Experienced investor" },
];

const ageOptions: { value: AgeGroup; label: string }[] = [
  { value: "14-18", label: "14 – 18" },
  { value: "18+", label: "18+" },
];

function getStartingRange(experience: ExperienceLevel, age: AgeGroup): { min: number; max: number } {
  if (age === "14-18") return { min: 500, max: 500 };
  switch (experience) {
    case "beginner":
      return { min: 500, max: 2000 };
    case "intermediate":
      return { min: 500, max: 3000 };
    case "pro":
      return { min: 500, max: 5000 };
  }
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [investment, setInvestment] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  const range = experience && age ? getStartingRange(experience, age) : null;

  const handleFinish = async () => {
    if (!experience || !age || !range) return;

    let amount = parseInt(investment, 10) || range.min;
    amount = Math.max(range.min, Math.min(amount, range.max));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setSaving(true);
    try {
      await supabase.auth.getSession();

      const confidence_score = confidenceScoreForLevel(experience);
      const username = (user.user_metadata?.username as string | undefined) ?? "";
      const email = user.email ?? "";

      const profilePayload = {
        username,
        email,
        experience_level: experience,
        age_group: age,
        starting_cash: amount,
        cash_balance: amount,
        max_cap: range.max,
        confidence_score,
        onboarding_completed: true as const,
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (readErr) {
        toast({
          title: "Could not load profile",
          description: formatPostgrestError(readErr),
          variant: "destructive",
        });
        return;
      }

      if (existing) {
        const { error: upErr } = await supabase.from("profiles").update(profilePayload).eq("user_id", user.id);
        if (upErr) {
          toast({ title: "Save failed", description: formatPostgrestError(upErr), variant: "destructive" });
          return;
        }
      } else {
        const { error: insErr } = await supabase.from("profiles").insert({
          user_id: user.id,
          ...profilePayload,
        });
        if (insErr) {
          toast({ title: "Save failed", description: formatPostgrestError(insErr), variant: "destructive" });
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "You're all set!", description: "Your profile and starting cash are saved." });
      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not save onboarding.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground">Let's personalize your experience</h1>
          <p className="text-muted-foreground text-sm mt-1">Step {step + 1} of 3</p>
          <div className="flex gap-2 justify-center mt-4">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>

        <div className="glass-card p-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">What's your investing experience?</h2>
                <div className="space-y-3">
                  {experienceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setExperience(opt.value);
                        setStep(1);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        experience === opt.value ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="text-left">
                        <p className="font-display font-semibold text-foreground">{opt.label}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-lg font-semibold text-foreground mb-4">What's your age group?</h2>
                <div className="space-y-3">
                  {ageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAge(opt.value);
                        setStep(2);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        age === opt.value ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"
                      }`}
                    >
                      <p className="font-display font-semibold text-foreground">{opt.label}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setStep(0)} className="mt-4 text-sm text-muted-foreground hover:text-primary">
                  ← Back
                </button>
              </motion.div>
            )}

            {step === 2 && range && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Choose your starting investment</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {range.min === range.max
                    ? `Your starting amount is $${range.min.toLocaleString()} (virtual money).`
                    : `You can start with $${range.min.toLocaleString()} – $${range.max.toLocaleString()} (virtual money).`}
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Amount ($)</Label>
                    <Input
                      type="number"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      placeholder={`${range.min}`}
                      min={range.min}
                      max={range.max}
                      className="bg-secondary border-border text-foreground text-lg font-display"
                    />
                    {investment && parseInt(investment, 10) > range.max && (
                      <p className="text-xs text-warning">Maximum is ${range.max.toLocaleString()}. We'll cap it for you.</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={handleFinish}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold py-5"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {saving ? "Saving…" : "Start Trading"}
                  </Button>
                </div>
                <button type="button" onClick={() => setStep(1)} className="mt-4 text-sm text-muted-foreground hover:text-primary">
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
