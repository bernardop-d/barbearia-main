import { Link } from 'react-router-dom'

const SECOES = [
  {
    titulo: '1. Responsável pelo tratamento',
    texto: 'BPD (Your Barber) é o operador de dados. Os proprietários de barbearia são os controladores dos dados de seus clientes, conforme a LGPD (Lei 13.709/2018).',
  },
  {
    titulo: '2. Dados coletados',
    texto: 'Proprietários: nome, e-mail, senha (criptografada) e dados da barbearia. Clientes que agendam: nome e WhatsApp (opcionais além do nome). Não coletamos dados de pagamento diretamente.',
  },
  {
    titulo: '3. Finalidade',
    texto: 'Os dados são usados para: gerenciar agendamentos, identificar clientes, enviar lembretes via WhatsApp (quando o número é fornecido voluntariamente) e melhorar a plataforma.',
  },
  {
    titulo: '4. Base legal (LGPD)',
    texto: 'O tratamento de dados se baseia em: execução de contrato (para uso do serviço), legítimo interesse (segurança e melhoria do sistema) e consentimento (para comunicações por WhatsApp).',
  },
  {
    titulo: '5. Compartilhamento',
    texto: 'Os dados dos clientes são acessíveis ao proprietário da barbearia, exclusivamente para fins de gestão. Não vendemos nem compartilhamos dados com terceiros para fins comerciais. Usamos Supabase (infraestrutura de banco de dados, com servidores na AWS) como processador de dados.',
  },
  {
    titulo: '6. Retenção',
    texto: 'Dados de proprietários são mantidos enquanto a conta estiver ativa. Após cancelamento, são excluídos em até 30 dias. Dados de clientes (agendamentos) seguem o mesmo prazo, salvo obrigação legal.',
  },
  {
    titulo: '7. Segurança',
    texto: 'Usamos criptografia em repouso e em trânsito (HTTPS/TLS). Senhas nunca são armazenadas em texto puro. Acesso ao banco de dados é restrito por políticas de Row Level Security (RLS).',
  },
  {
    titulo: '8. Seus direitos (LGPD)',
    texto: 'Você tem direito a: confirmar existência de tratamento, acessar seus dados, corrigir dados incompletos ou desatualizados, solicitar anonimização ou exclusão, revogar consentimento e portabilidade dos dados. Atendemos solicitações em até 15 dias.',
  },
  {
    titulo: '9. Cookies',
    texto: 'Usamos apenas cookies essenciais para manter a sessão autenticada (token JWT). Não usamos cookies de rastreamento, analytics ou publicidade.',
  },
  {
    titulo: '10. Menores de idade',
    texto: 'O serviço não é direcionado a menores de 18 anos. Não coletamos dados de menores intencionalmente.',
  },
  {
    titulo: '11. Alterações',
    texto: 'Esta política pode ser atualizada. Mudanças relevantes serão comunicadas por e-mail com 15 dias de antecedência.',
  },
  {
    titulo: '12. Encarregado de dados (DPO)',
    texto: null,
    email: 'contato.bernardopd@gmail.com',
  },
]

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-ink-400 text-sm hover:text-white transition-colors mb-8 inline-block">
          ← Voltar
        </Link>
        <h1 className="font-display text-4xl tracking-wide mb-2">Política de Privacidade</h1>
        <p className="text-ink-500 text-sm mb-2">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
        <p className="text-ink-600 text-xs mb-10">
          Em conformidade com a LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)
        </p>

        <div className="flex flex-col gap-7">
          {SECOES.map(s => (
            <section key={s.titulo}>
              <h2 className="text-white font-semibold mb-2">{s.titulo}</h2>
              {s.texto && <p className="text-ink-400 text-sm leading-relaxed">{s.texto}</p>}
              {s.email && (
                <p className="text-ink-400 text-sm">
                  Contato do encarregado:{' '}
                  <a href={`mailto:${s.email}`} className="text-blade-400 hover:underline">
                    {s.email}
                  </a>
                </p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-ink-800 flex gap-4 text-ink-600 text-xs">
          <Link to="/"      className="hover:text-ink-400">Início</Link>
          <Link to="/termos" className="hover:text-ink-400">Termos de Uso</Link>
        </div>
      </div>
    </div>
  )
}
