// Garanta que estas linhas estejam no topo do arquivo
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

// Encontre a função que é chamada quando o botão é clicado (pode ter um nome como handleLogin, onConnect, etc.)
// e substitua o conteúdo dela por este bloco:
async function handleConnectToTwitter() {
  console.log('Iniciando a chamada para a função no Supabase...');
  
  // Esta é a chamada original para a função no Supabase
  const { data, error } = await supabase.functions.invoke('twitter-auth');

  // Este é o "termômetro" que você encontrou
  if (error) {
    console.error('A chamada para a função do Supabase falhou. Erro original:', error);
    
    if (error instanceof FunctionsHttpError) {
      try {
        const errorMessage = await error.context.json();
        console.error('ERRO DETALHADO (lido pelo front-end):', errorMessage);
        alert(`Erro retornado pelo servidor: ${errorMessage.message}`);
      } catch (e) {
        console.error('A resposta do erro não era JSON:', error.context.text());
        alert('Ocorreu um erro no servidor, e a resposta não pôde ser lida.');
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
