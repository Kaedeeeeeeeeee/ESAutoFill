"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function SettingsPage() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteAll = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const res = await fetch(`${API_BASE}/api/profile/delete-all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setMessage("全てのデータを削除しました");
      setConfirmDelete(false);
    } else {
      setMessage("削除に失敗しました");
    }
    setDeleting(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-bold mb-4">アカウント</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          ログアウト
        </button>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-bold mb-2">プライバシー</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          個人情報（氏名、メール、電話番号）はAES-256-GCMで暗号化されて保存されています。
          データはお客様のアカウントに紐づいており、他のユーザーからアクセスすることはできません。
        </p>
      </div>

      {/* Delete All */}
      <div className={`rounded-xl border p-6 ${confirmDelete ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
        <h2 className="font-bold text-red-600 mb-2">データ削除</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          プロフィール、経験、企業情報、提出履歴、アップロードファイル全てを完全に削除します。この操作は元に戻せません。
        </p>

        {confirmDelete && (
          <p className="text-sm text-red-600 font-semibold mb-3">
            本当に全てのデータを削除しますか？
          </p>
        )}

        <div className="flex gap-3">
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-red-300 text-red-600 hover:bg-red-50"
            } disabled:opacity-50`}
          >
            {deleting ? "削除中..." : confirmDelete ? "完全に削除する" : "全てのデータを削除"}
          </button>
        </div>

        {message && (
          <p className={`text-sm mt-3 ${message.includes("削除しました") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
