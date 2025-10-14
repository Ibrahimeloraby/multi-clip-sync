import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "30 second max video length",
        "Up to 5 participants",
        "Basic timeline editor",
        "720p video quality",
        "5 GB storage"
      ],
      cta: "Get Started",
      variant: "secondary" as const
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      features: [
        "2 minute max video length",
        "Up to 20 participants",
        "Advanced timeline editor",
        "1080p video quality",
        "50 GB storage",
        "Priority support"
      ],
      cta: "Start Free Trial",
      variant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      features: [
        "10 minute max video length",
        "Unlimited participants",
        "Professional timeline editor",
        "4K video quality",
        "500 GB storage",
        "Dedicated support",
        "Custom branding",
        "API access"
      ],
      cta: "Contact Sales",
      variant: "secondary" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in">
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold">
              Choose Your <span className="gradient-text">Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select the perfect tier for your collaborative video needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`glass-card p-8 space-y-6 hover-lift relative ${
                  plan.popular ? 'border-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="gradient-primary px-4 py-1 rounded-full text-xs font-medium text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                  <div className="space-y-1">
                    <div className="text-4xl font-bold gradient-text">{plan.price}</div>
                    <p className="text-sm text-muted-foreground">{plan.period}</p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.variant} 
                  className={`w-full ${plan.popular ? 'gradient-primary' : ''}`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          <div className="text-center space-y-4 pt-12">
            <h2 className="text-2xl font-bold">Need a custom solution?</h2>
            <p className="text-muted-foreground">
              Contact our sales team for custom enterprise plans with tailored features.
            </p>
            <Button variant="secondary" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
