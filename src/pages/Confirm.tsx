import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Shield, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Confirm = () => {
  const navigate = useNavigate();

  // TODO: Substituir por dados reais do usuário após OAuth
  const mockUser = {
    name: "João Silva",
    username: "@joaosilva",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=mock"
  };

  const handleConfirm = () => {
    navigate("/processing");
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {/* Confirmation Card */}
          <Card className="p-8 text-center animate-scale-in">
            <div className="space-y-6">
              {/* User Info */}
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-foreground">
                  Confirmação de Conta
                </h1>
                <p className="text-muted-foreground">
                  Você está conectado como:
                </p>
                
                <div className="flex items-center justify-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={mockUser.profileImage} alt={mockUser.name} />
                    <AvatarFallback>
                      {mockUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{mockUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{mockUser.username}</p>
                  </div>
                </div>
              </div>

              {/* Warning Section */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-left space-y-2">
                    <h3 className="font-semibold text-destructive">
                      Ação Irreversível
                    </h3>
                    <p className="text-sm text-destructive/80">
                      Esta ação irá apagar permanentemente seus 3.200 tweets mais recentes. 
                      Esta operação <strong>não pode ser desfeita</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Process Info */}
              <div className="text-left space-y-3 bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground">O que vai acontecer:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-twitter rounded-full"></div>
                    Buscaremos seus tweets mais recentes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    Excluiremos até 3.200 tweets
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    Você poderá revogar o acesso após o processo
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-4">
                <Button 
                  variant="destructive" 
                  size="xl" 
                  onClick={handleConfirm}
                  className="w-full"
                >
                  <X className="w-5 h-5" />
                  Sim, apagar 3.200 tweets permanentemente
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleCancel}
                  className="w-full"
                >
                  Cancelar e voltar
                </Button>
              </div>

              {/* Security Notice */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/30">
                <Shield className="w-3 h-3" />
                <span>Seus dados não são armazenados em nossos servidores</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Confirm;