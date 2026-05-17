import { Link } from 'react-router-dom'

const SECOES = [
  {
    titulo: '1. Aceitação',
    texto: 'Ao usar o Your Barber, você concorda com estes termos. Se não concordar, não utilize o serviço.',
  },
  {
    titulo: '2. Descrição do serviço',
    texto: 'O Your Barber é uma plataforma SaaS para gestão de barbearias. Oferece agendamento online, controle de agenda, financeiro e estoque.',
  },
  {
    titulo: '3. Conta e acesso',
    texto: 'Você é responsável pela segurança das suas credenciais. Não compartilhe sua senha. O Your Barber não se responsabiliza por acessos não autorizados por uso indevido de credenciais.',
  },
  {
    titulo: '4. Uso aceitável',
    texto: 'É proibido usar a plataforma para fins ilegais, enviar spam, tentar acessar sistemas de outros usuários ou praticar qualquer ação que prejudique o serviço ou outros usuários.',
  },
  {
    titulo: '5. Pagamento',
    texto: 'O serviço é cobrado conforme o plano escolhido. O cancelamento pode ser feito a qualquer momento, sem multa, com efeito ao final do período pago.',
  },
  {
    titulo: '6. Responsabilidades',
    texto: 'O usuário é responsável pelo conteúdo inserido e pelo relacionamento com seus clientes. O Your Barber é uma plataforma tecnológica e não se responsabiliza por disputas entre proprietários e clientes.',
  },
  {
    titulo: '7. Disponibilidade',
    texto: 'Buscamos alta disponibilidade, mas não garantimos funcionamento ininterrupto. Manutenções programadas serão comunicadas com antecedência quando possível.',
  },
  {
    titulo: '8. Propriedade intelectual',
    texto: 'O software, design e marca "Your Barber" são de propriedade exclusiva de BPD. Os dados inseridos pelo usuário pertencem ao usuário.',
  },
  {
    titulo: '9. Encerramento',
    texto: 'O Your Barber pode encerrar contas que violem estes termos. O usuário pode cancelar a qualquer momento pelo painel ou por e-mail, com exportação dos seus dados.',
  },
  {
    titulo: '10. Alterações',
    texto: 'Estes termos podem ser atualizados. Mudanças significativas serão comunicadas por e-mail com 15 dias de antecedência.',
  },
  {
    titulo: '11. Lei aplicável',
    texto: 'Estes termos são regidos pela legislação brasileira. Foro: comarca de São Paulo/SP.',
  },
  {
    titulo: '12. Contato',
    texto: null,
    email: 'contato.bernardopd@gmail.com',
  },
]

export default function Termos() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-ink-400 text-sm hover:text-white transition-colors mb-8 inline-block">
          ← Voltar
        </Link>
        <h1 className="font-display text-4xl tracking-wide mb-2">Termos de Uso</h1>
        <p className="text-ink-500 text-sm mb-10">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="flex flex-col gap-7">
          {SECOES.map(s => (
            <section key={s.titulo}>
              <h2 className="text-white font-semibold mb-2">{s.titulo}</h2>
              {s.texto && <p className="text-ink-400 text-sm leading-relaxed">{s.texto}</p>}
              {s.email && (
                <p className="text-ink-400 text-sm">
                  Dúvidas:{' '}
                  <a href={`mailto:${s.email}`} className="text-blade-400 hover:underline">
                    {s.email}
                  </a>
                </p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-ink-800 flex gap-4 text-ink-600 text-xs">
          <Link to="/"            className="hover:text-ink-400">Início</Link>
          <Link to="/privacidade" className="hover:text-ink-400">Política de Privacidade</Link>
        </div>
      </div>
    </div>
  )
}
