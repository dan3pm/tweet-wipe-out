import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Trash2, Twitter, X } from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.jpg";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  // Adicione estas duas linhas no topo do arquivo, junto com os outros 'import'
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

// Esta é a nova função completa que substitui a 'handleConnect' antiga
async function handleConnect() {
  console.log('Iniciando a chamada para a função no Supabase...');
  
  const { data, error } = await supabase.functions.invoke('twitter-auth');

  if (error) {
    console.error('A chamada para a função do Supabase falhou. Erro original:', error);
    
    if (error instanceof FunctionsHttpError) {
      try {
        const errorMessage = await error.context.json();
        console.error('ERRO DETALHADO (lido pelo front-end):', errorMessage);
        alert(`Erro retornado pelo servidor: ${errorMessage.message || JSON.stringify(errorMessage)}`);
      } catch (e) {
        const errorText = await error.context.text();
        console.error('A resposta do erro não era JSON:', errorText);
        alert(`Ocorreu um erro no servidor: ${errorText}`);
      }
    } else {
      // Outros tipos de erro (ex: de rede)
      alert(`Erro inesperado: ${error.message}`);
    }
    return; // Para a execução aqui
  }
  
  // Se chegasse aqui, significaria sucesso
  console.log('Função executada com sucesso!', data);
  if (data && data.authUrl) {
    window.location.href = data.authUrl;
  }
}
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Brand */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-destructive/10 rounded-2xl">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">TweetWipe</h1>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                Limpe seu Twitter.{" "}
                <span className="text-muted-foreground">De graça.</span>{" "}
                <span className="text-foreground">Com um clique.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Apague seus 3.200 tweets mais recentes de forma segura e irreversível. 
                A ferramenta mais simples para recomeçar.
              </p>
            </div>

            {/* Hero Image */}
            

            {/* CTA Button */}
            <div className="animate-scale-in">
              <Button variant="hero" size="xl" onClick={handleConnect} className="mb-8">
                <X className="w-5 h-5" />
                Conectar com o X para Limpar
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
              <Card className="p-6 bg-card/50 border-0 shadow-sm animate-fade-in">
                <Shield className="w-8 h-8 text-success mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">100% Seguro</h3>
                <p className="text-sm text-muted-foreground">
                  Não armazenamos seus dados. Processo totalmente transparente.
                </p>
              </Card>

              <Card className="p-6 bg-card/50 border-0 shadow-sm animate-fade-in [animation-delay:200ms]">
                <Trash2 className="w-8 h-8 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Até 3.200 Tweets</h3>
                <p className="text-sm text-muted-foreground">
                  Remove seus tweets mais recentes de forma eficiente.
                </p>
              </Card>

              <Card className="p-6 bg-card/50 border-0 shadow-sm animate-fade-in [animation-delay:400ms]">
                <Twitter className="w-8 h-8 text-twitter mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Permissões Mínimas</h3>
                <p className="text-sm text-muted-foreground">
                  Solicita apenas o acesso necessário para limpar seus tweets.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Security Notice */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Aviso de Segurança</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-destructive">Esta ação é irreversível.</strong> O TweetWipe 
              solicita apenas as permissões estritamente necessárias para ler e excluir seus tweets. 
              Nenhum dado é armazenado em nossos servidores. Após o processo, você pode revogar 
              o acesso nas configurações do seu Twitter/X.
            </p>
            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                TweetWipe © 2024 - Ferramenta gratuita para limpeza de tweets
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;
