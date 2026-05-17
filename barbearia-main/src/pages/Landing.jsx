import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '📱', title: 'Agendamento online', desc: 'Clientes agendam pelo celular 24h. Link personalizado com o nome da sua barbearia, sem baixar app.' },
  { icon: '📊', title: 'Controle total', desc: 'Agenda, financeiro, estoque e configurações num painel rápido. Acesse do celular ou computador.' },
  { icon: '⚡', title: 'Funciona como app', desc: 'Instale direto no celular sem App Store. Rápido, funciona offline e sem anúncios.' },
]

const PLANO_ITEMS = [
  'Agendamentos ilimitados',
  'Painel admin completo',
  'Controle financeiro e estoque',
  'Serviços configuráveis',
  'Horários personalizados',
  'Notificação via WhatsApp',
  'Link de agendamento próprio',
  'Suporte por WhatsApp',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-800 sticky top-0 bg-ink/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-display text-2xl text-gradient tracking-widest">Your Barber</div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-ink-400 text-sm hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link to="/cadastro" className="btn-primary text-sm px-5 py-2.5 max-w-fit">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blade-500/5 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blade-500/10 border border-blade-500/20 text-blade-400 text-xs font-medium mb-8 tracking-wide">
            ✂️ Sistema completo para barbearias
          </div>
          <h1 className="font-display text-6xl sm:text-7xl text-white tracking-wide leading-none mb-6">
            Sua barbearia<br />
            <span className="text-gradient">no próximo nível</span>
          </h1>
          <p className="text-ink-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Agendamento online, controle de agenda, financeiro e estoque.
            Tudo simples, rápido e feito para o Brasil.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cadastro" className="btn-primary text-base px-8 py-4 max-w-fit">
              Começar gratuitamente →
            </Link>
            <p className="text-ink-500 text-sm">Sem cartão de crédito</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="card flex flex-col gap-3">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-white font-semibold">{f.title}</h3>
              <p className="text-ink-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-sm mx-auto px-6 pb-24 w-full">
        <div className="card border-blade-500/20 text-center">
          <p className="text-ink-400 text-xs uppercase tracking-wider mb-3">Plano único — tudo incluso</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-ink-400 text-lg">R$</span>
            <span className="font-display text-6xl text-white">49</span>
            <span className="text-ink-400">/mês</span>
          </div>
          <p className="text-ink-500 text-xs mb-6">ou R$490/ano — 2 meses grátis</p>

          <ul className="flex flex-col gap-2 text-sm text-ink-300 mb-8 text-left">
            {PLANO_ITEMS.map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-blade-400 shrink-0">✓</span> {item}
              </li>
            ))}
          </ul>

          <Link to="/cadastro" className="btn-primary block">
            Testar grátis por 14 dias
          </Link>
          <p className="text-ink-600 text-xs mt-3">Cancele a qualquer momento</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-800 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-ink-600 text-xs">
          <p>Your Barber © {new Date().getFullYear()} — by BPD</p>
          <div className="flex gap-4">
            <Link to="/termos"      className="hover:text-ink-400 transition-colors">Termos de uso</Link>
            <Link to="/privacidade" className="hover:text-ink-400 transition-colors">Privacidade</Link>
            <Link to="/login"       className="hover:text-ink-400 transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
