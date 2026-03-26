"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [stats, setStats] = useState({ experiences: 0, companies: 0, submissions: 0 });
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserName(user.email ?? "");

    const [exp, comp, sub] = await Promise.all([
      supabase.from("experiences").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("submissions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    setStats({
      experiences: exp.count ?? 0,
      companies: comp.count ?? 0,
      submissions: sub.count ?? 0,
    });
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">ダッシュボード</h1>
      <p className="text-sm text-gray-500 mb-8">{userName}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="登録経験" value={stats.experiences} unit="件" href="/dashboard/profile" />
        <StatCard label="管理企業" value={stats.companies} unit="社" href="/dashboard/companies" />
        <StatCard label="提出済みES" value={stats.submissions} unit="件" href="/dashboard/history" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold mb-3">クイックスタート</h2>
        <div className="space-y-3 text-sm">
          <QuickAction
            step={1}
            title="プロフィールを登録"
            description="履歴書やESをアップロードして、経験を自動で構造化します"
            href="/dashboard/profile"
          />
          <QuickAction
            step={2}
            title="Chrome拡張をインストール"
            description="ESフォームのあるページでワンクリック自動入力"
            href="#"
          />
          <QuickAction
            step={3}
            title="企業を管理"
            description="志望企業を登録して、企業別の志望動機を管理"
            href="/dashboard/companies"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, href }: { label: string; value: number; unit: string; href: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">
        {value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </div>
    </Link>
  );
}

function QuickAction({ step, title, description, href }: { step: number; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-gray-500 text-xs">{description}</div>
      </div>
    </Link>
  );
}
