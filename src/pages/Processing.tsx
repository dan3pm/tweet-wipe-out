import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trash2, Shield, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Processing = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Conectando à API do X...");

  // Simula o progresso da exclusão
  useEffect(() => {
    const steps = [
      { text: "Conectando à API do X...", duration: 2000 },
      { text: "Buscando seus tweets...", duration: 3000 },
      { text: "Excluindo tweets (isso pode demorar)...", duration: 8000 },
      { text: "Finalizando processo...", duration: 2000 }
    ];

    let currentStepIndex = 0;
    let currentProgress = 0;

    const updateProgress = () => {
      const step = steps[currentStepIndex];
      const stepProgress = 100 / steps.length;
      const targetProgress = (currentStepIndex + 1) * stepProgress;
      
      const interval = setInterval(() => {
        currentProgress += 1;
        setProgress(Math.min(currentProgress, targetProgress));
        
        if (currentProgress >= targetProgress) {
          clearInterval(interval);
          currentStepIndex++;
          
          if (currentStepIndex < steps.length) {
            setCurrentStep(steps[currentStepIndex].text);
            setTimeout(updateProgress, 500);
          } else {
            // Processo completo - redirecionar para sucesso
            setTimeout(() => navigate("/success"), 1000);
          }
        }
      }, step.duration / stepProgress);
    };

    setCurrentStep(steps[0].text);
    setTimeout(updateProgress, 1000);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Processing Card */}
          <Card className="p-8 text-center animate-scale-in">
            <div className="space-y-8">
              {/* Loading Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="p-6 bg-destructive/10 rounded-full">
                    <Trash2 className="w-12 h-12 text-destructive" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Loader2 className="w-6 h-6 text-destructive animate-spin" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-foreground">
                  Apagando seus tweets...
                </h1>
                <p className="text-muted-foreground">
                  {currentStep}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}% concluído
                </p>
              </div>

              {/* Important Instructions */}
              <div className="bg-twitter/5 border border-twitter/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-twitter flex-shrink-0 mt-0.5" />
                  <div className="text-left space-y-2">
                    <h3 className="font-semibold text-twitter">
                      Importante: Mantenha a página aberta
                    </h3>
                    <p className="text-sm text-twitter/80">
                      Este processo pode levar alguns minutos. Não feche esta aba até 
                      que o processo seja concluído completamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Process Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-twitter/10 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-4 h-4 text-twitter" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buscando tweets
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Processando exclusão
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Finalização segura
                  </p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="text-xs text-muted-foreground pt-4 border-t border-border/30">
                <p>
                  Respeitando os limites de taxa da API do X para garantir a segurança
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Processing;