// アプリ内モーダル／トーストの命令的API。
//
// ブラウザ標準の alert / confirm / window.prompt は使わない（全プロジェクト共通ルール）。
// OSごとに見た目が変わりアプリの外側で出るため、「操作の続き」ではなく
// 「異常が起きた」と読まれる。文言も配置も調整できない。
//
// 使い方（どこからでも呼べる。React コンポーネントの外でも動く）:
//   if (!(await uiConfirm({ message: "削除します", danger: true }))) return;
//   await uiAlert({ message: "コピーに失敗しました" });
//   const name = await uiPrompt({ title: "フォルダ名" });
//   uiToast("保存しました");
//
// 実体を描くのは <UiDialogHost />（app/layout.tsx に1つだけ置く）。

export type ToastKind = "success" | "error" | "info";

export type ConfirmOptions = {
  title?: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  /** 取り消せない操作。ボタンを赤にして警告アイコンを出す */
  danger?: boolean;
};

export type AlertOptions = {
  title?: string;
  message: string;
  okLabel?: string;
  /** 失敗を伝えるとき。アイコンを赤にする */
  danger?: boolean;
};

export type PromptOptions = {
  title?: string;
  note?: string;
  value?: string;
  placeholder?: string;
  okLabel?: string;
  maxLength?: number;
};

export type DialogRequest =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { id: number; kind: "alert"; options: AlertOptions; resolve: () => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

export type ToastItem = { id: number; message: string; kind: ToastKind };

type Listener = () => void;

let seq = 0;
let queue: DialogRequest[] = [];
let toasts: ToastItem[] = [];
let hostMounted = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** <UiDialogHost /> から呼ぶ。購読と、ホストが居ることの登録。 */
export function subscribeUiDialog(listener: Listener): () => void {
  listeners.add(listener);
  hostMounted = true;
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) hostMounted = false;
  };
}

export function getDialogQueue(): DialogRequest[] {
  return queue;
}

export function getToasts(): ToastItem[] {
  return toasts;
}

/** 先頭の要求を片付ける（ホストが答えを受け取ったあとに呼ぶ） */
export function resolveTop(): void {
  queue = queue.slice(1);
  emit();
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

// ホストが居ないところ（SSR・テスト）で呼ばれた場合の扱い。
// ⚠️ confirm を true で返すと「聞かずに実行」になるので必ず false（fail-closed）。
//    黙って何も起きないと原因が追えないので、コンソールには残す。
function noHost(what: string) {
  if (typeof console !== "undefined") {
    console.error(`[ui-dialog] ${what} が呼ばれましたが <UiDialogHost /> がありません`);
  }
}

export function uiConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!hostMounted) {
    noHost("uiConfirm");
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { id: ++seq, kind: "confirm", options, resolve }];
    emit();
  });
}

export function uiAlert(options: AlertOptions): Promise<void> {
  if (!hostMounted) {
    noHost("uiAlert");
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    queue = [...queue, { id: ++seq, kind: "alert", options, resolve }];
    emit();
  });
}

export function uiPrompt(options: PromptOptions): Promise<string | null> {
  if (!hostMounted) {
    noHost("uiPrompt");
    return Promise.resolve(null);
  }
  return new Promise<string | null>((resolve) => {
    queue = [...queue, { id: ++seq, kind: "prompt", options, resolve }];
    emit();
  });
}

/** 押さなくても消える短い知らせ。操作を止めない用途はこちら。 */
export function uiToast(message: string, kind: ToastKind = "success"): void {
  if (!hostMounted) {
    noHost("uiToast");
    return;
  }
  const id = ++seq;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => dismissToast(id), kind === "error" ? 5000 : 3200);
}
