import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, X, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Confirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setError('Funcionalidade de autenticação removida. Esta versão não conecta com serviços externos.');
    } catch (error: any) {
      console.error('Error processing callback:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      alert('Funcionalidade de processamento removida. Esta versão não conecta com serviços externos.');
    } catch (error: any) {
      console.error('Error starting processing:', error);
      alert(`Erro ao iniciar o processamento: ${error.message || 'Tente novamente.'}`);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('tweetwipe_session');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Processando autenticação...</p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="space-y-6">
                <div className="text-destructive">
                  <X className="w-12 h-12 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold mb-2">Erro na Autenticação</h1>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                
                <Button variant="outline" onClick={handleCancel}>
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Início
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Confirmation Card */}
          <Card className="p-8 animate-scale-in">
            <div className="space-y-8">
              {/* User Info */}
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Conectado como @{user?.username}
                  </h1>
                  <p className="text-muted-foreground">
                    Confirme se esta é a conta correta antes de prosseguir.
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-destructive">
                      ⚠️ Ação Irreversível
                    </h3>
                    <p className="text-sm text-destructive/80">
                      Esta ação irá apagar permanentemente seus tweets mais recentes (até 3.200). 
                      Não será possível recuperá-los depois. Certifique-se de que realmente deseja prosseguir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Process Info */}
              <div className="bg-twitter/5 border border-twitter/20 rounded-lg p-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-twitter">
                    O que acontecerá?
                  </h3>
                  <p className="text-sm text-twitter/80">
                    • Buscaremos seus tweets mais recentes<br/>
                    • Apagaremos cada tweet individualmente<br/>
                    • O processo pode levar 5-10 minutos<br/>
                    • Você pode acompanhar o progresso na próxima tela
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancelar
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="lg"
                  onClick={handleConfirm}
                  className="order-1 sm:order-2"
                >
                  Sim, apagar tweets permanentemente
                </Button>
              </div>

              {/* Security Note */}
              <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border/30">
                <p>
                  Após o processo, você pode revogar o acesso nas configurações do seu X
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Confirm;