import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp, Shield, Trophy, Brain, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Shield,
    title: "Risk-Free Trading",
    description: "Practice with virtual money using real market data. No real money at stake.",
  },
  {
    icon: Brain,
    title: "AI-Guided Learning",
    description: "Get personalized tips and explanations from your AI investing companion.",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description: "Earn streaks, complete missions, and build your confidence score.",
  },
  {
    icon: BarChart3,
    title: "Real Market Data",
    description: "Trade with live stock prices and learn from real market conditions.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-lg text-foreground">Fintor</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Log in</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Trophy className="h-4 w-4" />
              Learn investing without the risk
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Fintor</span>
              <br />
              <span className="text-gradient text-4xl md:text-6xl lg:text-7xl leading-tight block mt-1">
                your financial mentor
              </span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 font-body">
              Trade stocks with virtual money, learn from real market data, and grow your investing skills — all in a safe, gamified environment.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold text-base px-8 py-6 glow-green">
                  Start Trading Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Mock chart visual */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 glass-card p-6 max-w-4xl mx-auto glow-green"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-body">Portfolio Value</p>
                <p className="text-3xl font-display font-bold text-foreground">$6,247.83</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-body">Total Return</p>
                <p className="text-2xl font-display font-bold text-primary">+24.96%</p>
              </div>
            </div>
            {/* SVG Chart */}
            <svg viewBox="0 0 800 200" className="w-full h-40">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,180 Q100,160 150,140 T300,100 T450,120 T600,60 T750,40 L800,30"
                fill="none"
                stroke="hsl(160 84% 39%)"
                strokeWidth="2.5"
              />
              <path
                d="M0,180 Q100,160 150,140 T300,100 T450,120 T600,60 T750,40 L800,30 L800,200 L0,200 Z"
                fill="url(#chartGradient)"
              />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12 text-foreground">
            Everything you need to learn investing
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="glass-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products & Info Section */}
      <section className="py-16 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Resources */}
            <div>
              <h3 className="font-display font-semibold text-foreground mb-6">Resources</h3>
              <div className="space-y-4">
                <div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <a href="#" className="hover:text-foreground transition-colors">Supabase</a><br />
                    <a href="#" className="hover:text-foreground transition-colors">FinHub</a>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div>
              <h3 className="font-display font-semibold text-foreground mb-6">Contacts</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Email:</span>
                  <br />
                  <a href="mailto:hello@papertrade.com" className="hover:text-foreground transition-colors">hello@papertrade.com</a>
                </li>
                <li>
                  <span className="font-medium text-foreground">Support:</span>
                  <br />
                  <a href="mailto:support@papertrade.com" className="hover:text-foreground transition-colors">support@papertrade.com</a>
                </li>
                <li>
                  <span className="font-medium text-foreground">Phone:</span>
                  <br />
                  <a href="tel:+1234567890" className="hover:text-foreground transition-colors">+1 (234) 567-890</a>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h3 className="font-display font-semibold text-foreground mb-6">About</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">About PaperTrade</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">Our Mission</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold">Papertrade</span>
          </div>
          <p>Virtual trading platform for learning. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
