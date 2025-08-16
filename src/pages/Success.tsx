import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Home, Shield, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Success = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleRevokeAccess = () => {
    // TODO: Implementar redirecionamento para configurações do Twitter/X
    window.open("https://twitter.com/settings/connected_apps", "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <Card className="p-8 text-center animate-scale-in">
            <div className="space-y-8">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="p-6 bg-success/10 rounded-full">
                  <CheckCircle className="w-16 h-16 text-success" />
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-foreground">
                  Processo concluído!
                </h1>
                <p className="text-xl text-muted-foreground">
                  Seus tweets foram apagados com sucesso.
                </p>
              </div>

              {/* Process Summary */}
              <div className="bg-success/5 border border-success/20 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-success">
                      Limpeza Concluída
                    </h3>
                  </div>
                  <p className="text-sm text-success/80">
                    Todos os seus tweets elegíveis foram removidos permanentemente 
                    do Twitter/X. Sua conta está agora com um histórico mais limpo.
                  </p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="text-left space-y-4">
                <h3 className="font-semibold text-foreground text-center">
                  O que fazer agora:
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                    <Shield className="w-5 h-5 text-twitter flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Revogue o acesso (Recomendado)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Por segurança, revogue o acesso do TweetWipe nas configurações do X
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                    <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Recomeço limpo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Agora você pode começar a tuitar novamente com um histórico limpo
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-4">
                <Button 
                  variant="twitter" 
                  size="lg" 
                  onClick={handleRevokeAccess}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4" />
                  Revogar acesso do TweetWipe
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleGoHome}
                  className="w-full"
                >
                  <Home className="w-4 h-4" />
                  Voltar ao início
                </Button>
              </div>

              {/* Final Note */}
              <div className="text-xs text-muted-foreground pt-6 border-t border-border/30 space-y-2">
                <p className="font-medium">
                  Obrigado por usar o TweetWipe!
                </p>
                <p>
                  Se você quiser limpar mais tweets no futuro, pode usar nossa ferramenta 
                  novamente a qualquer momento.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Success;