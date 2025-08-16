import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trash2, Shield, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProcessingStatus {
  status: string;
  progress: {
    processed: number;
    total: number;
    percentage: number;
  };
  user: {
    username: string;
  };
  errorMessage?: string;
}

const Processing = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [currentStep, setCurrentStep] = useState("Conectando à API do X...");

  useEffect(() => {
    const sessionId = localStorage.getItem('tweetwipe_session');
    
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Start polling for status
    const pollStatus = async () => {
      try {
        const response = await fetch(`/functions/v1/twitter-status?sessionId=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to get status');
        }

        const data = await response.json();
        setStatus(data);

        // Update current step based on status
        switch (data.status) {
          case 'processing':
            if (data.progress.total === 0) {
              setCurrentStep("Buscando seus tweets...");
            } else if (data.progress.processed === 0) {
              setCurrentStep(`Encontrados ${data.progress.total} tweets. Iniciando exclusão...`);
            } else {
              setCurrentStep(`Excluindo tweets (${data.progress.processed}/${data.progress.total})...`);
            }
            break;
          case 'completed':
            setCurrentStep("Processo concluído com sucesso!");
            setTimeout(() => navigate("/success"), 2000);
            break;
          case 'error':
            setCurrentStep(`Erro: ${data.errorMessage}`);
            break;
          default:
            setCurrentStep("Conectando à API do X...");
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setCurrentStep("Erro ao verificar status");
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial call

    return () => clearInterval(interval);
  }, [navigate]);

  const progress = status?.progress.percentage || 0;

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
                {status?.user && (
                  <p className="text-sm text-muted-foreground">
                    Conta: @{status.user.username}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}% concluído
                  {status?.progress && status.progress.total > 0 && (
                    <span className="ml-2">
                      ({status.progress.processed}/{status.progress.total} tweets)
                    </span>
                  )}
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
                      que o processo seja concluído completamente. Respeitar os limites 
                      da API do X é essencial para evitar bloqueios.
                    </p>
                  </div>
                </div>
              </div>

              {/* Process Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                    status?.progress.total > 0 ? 'bg-success/10' : 'bg-twitter/10'
                  }`}>
                    <Trash2 className={`w-4 h-4 ${
                      status?.progress.total > 0 ? 'text-success' : 'text-twitter'
                    }`} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buscando tweets
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                    status?.status === 'processing' ? 'bg-destructive/10' : 'bg-muted'
                  }`}>
                    {status?.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Processando exclusão
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                    status?.status === 'completed' ? 'bg-success/10' : 'bg-muted'
                  }`}>
                    <Shield className={`w-4 h-4 ${
                      status?.status === 'completed' ? 'text-success' : 'text-muted-foreground'
                    }`} />
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