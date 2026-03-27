import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-xl font-bold text-indigo-600">ES AutoFill</div>
        <Link
          href="/login"
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          ログイン
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-6">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          エントリーシートを
          <br />
          <span className="text-indigo-600">ワンクリック</span>で自動入力
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          プロフィールを一度登録するだけ。どの企業のESフォームでも、
          AIがあなたの経験に基づいて最適な内容を自動生成・入力します。
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
        >
          無料で始める
        </Link>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<SearchIcon />}
            title="フォーム自動検出"
            description="どの企業のESページでも、入力フィールドを自動で検出。氏名、ガクチカ、志望動機などを瞬時に識別します。"
          />
          <FeatureCard
            icon={<SparklesIcon />}
            title="AI内容生成"
            description="あなたのプロフィールと経験に基づき、文字数制限に合わせた最適なES文章をAIが自動生成します。"
          />
          <FeatureCard
            icon={<BoltIcon />}
            title="ワンクリック入力"
            description="生成された内容をプレビューで確認し、ワンクリックでフォームに一括入力。20社分のESも数分で完了。"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <h2 className="text-2xl font-bold text-center mb-12">使い方</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <Step number={1} title="プロフィール登録" description="履歴書やESをアップロードすると、AIが自動で経験をSTAR構造に整理します。" />
          <Step number={2} title="ESページを開く" description="企業のESページを開くと、右下にES AutoFillボタンが表示されます。" />
          <Step number={3} title="自動入力" description="ボタンを押すとAIが内容を生成。確認して入力するだけです。" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-indigo-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">就活のES作成を、もっと効率的に</h2>
        <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
          何十社ものESを手作業で書く時代は終わりました。まずは無料でお試しください。
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-xl text-lg font-semibold hover:bg-indigo-50 transition"
        >
          無料で始める
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-sm text-gray-400">
        &copy; 2026 ES AutoFill. All rights reserved.
      </footer>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
