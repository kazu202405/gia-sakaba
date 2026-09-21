# 酒場 DB 設計

更新日: 2026-09-21

## 1. 設計の基準

`app/guild`、`components/guild`、`lib/guild/types.ts` と、関連テストを現行仕様の正とする。
過去に参照されていた `contexts/projects/gia/sakaba_design.md` はリポジトリ内に存在しないため、
残っているコメントと画面挙動を本設計へ統合した。

既存の `public.seminars` / `public.event_attendees` は、GIA本体のセミナー申込用として維持する。
酒場はメンバー主催、紹介、非公開プロジェクト、限定の集まりなど権限モデルが異なるため、
無理に流用せず `sakaba` スキーマに分離する。

## 2. 方針

- DB列名は `lib/guild/types.ts` と合わせ、画面側の名前変換を最小化する。
- 認証は既存の `auth.users`、有料判定は既存の `public.applicants.plan` を利用する。
- プロフィールの連絡先は別表に分け、紹介が承諾されるまで取得できないようにする。
- プロジェクトは所有者と参加メンバーだけが見える。ギルドマスターにも特権で見せない。
- 通知本文は保存せず、種類・参照先・当時の状態から画面で組み立てる。
- 複数表を同時更新する操作はRPCにまとめる。通知だけ漏れる、上限を競合で超える、といった事故を防ぐ。
- 最初のマイグレーションでは全表のRLSを有効にし、ポリシー未設定の deny-by-default にする。

## 3. テーブルとコードの対応

| コード上の型・機能 | DB |
| --- | --- |
| `Guild` | `sakaba.guilds` |
| `Profile` の共通プロフィール部分 | `sakaba.profiles` |
| `Profile` のギルド別設定 | `sakaba.guild_members` |
| `ProfileContact` | `sakaba.profile_contacts` |
| 業種・キーワード | `sakaba.tags`, `sakaba.profile_tags` |
| `Invite` | `sakaba.invites` |
| `Quest` | `sakaba.quests` |
| `QuestApplication` | `sakaba.quest_applications` |
| `IntroRequest` | `sakaba.intro_requests` |
| マスターの非公開メモ | `sakaba.intro_request_notes` |
| `Party` | `sakaba.parties`, `sakaba.party_members` |
| `Project` | `sakaba.projects`, `sakaba.project_members` |
| `ProjectTask` | `sakaba.project_tasks` |
| `ProjectStep` | `sakaba.project_steps` |
| `ProjectContact` | `sakaba.project_contacts` |
| `StepRecord` | `sakaba.project_step_records` |
| `GuildNotification` | `sakaba.notifications` |

`Profile` は見本では1オブジェクトだが、本番では公開範囲と権限の違いから複数表を結合して返す。
画面にはRPCから現在と同じ形で返し、コンポーネントへの影響を抑える。

## 4. 重要な不変条件

- 入会は有効な招待コード経由だけ。コード比較は大文字小文字を区別しない。
- 招待の利用数確認、メンバー作成、利用数加算は1つのトランザクションで行う。
- 限定の集まりを作れるのは `owner` / `master` のみ。
- 限定の集まりの初回参加は承認待ち。承認時に `gathering_approved_at` も同時更新する。
- クエスト申込の承認・見送りと通知作成は同じRPCで行う。
- 紹介相手は `accept_intro = true` のメンバーに限る。
- 連絡先は紹介状態が `accepted` / `introduced` の当事者だけ取得できる。
- 無料会員が所有できるプロジェクトは2件。完了済みも数え、削除したときだけ枠が空く。
- 酒場の月480円契約は `public.applicants.plan` と分離し、`guild_members.billing_status` で管理する。
- `owner` / `master` は `billing_status = exempt` とし、酒場用Stripe契約なしで有料機能を使える。
- クエスト起点のプロジェクトは1クエストにつき1件。
- プロジェクトからメンバーを外すと、その人の担当タスクは未割当へ戻す。
- プロジェクト削除時はタスク、工程、相手、工程記録、メンバーも連鎖削除する。
- 紹介前のクエストを取り下げた場合、未成立の紹介依頼も同じ処理で取り下げる。

## 5. 実装順

1. `0077_sakaba_core_schema.sql`: テーブル、制約、索引、RLS有効化。
2. `0078_sakaba_access.sql`: 読み取りRPC、RLSポリシー、権限ヘルパー。
3. `0079_sakaba_member_quest_commands.sql`: 入会、プロフィール、クエスト、通知の更新RPC。
4. `0080_sakaba_billing_and_owner.sql`: 酒場専用課金状態と初期オーナー設定。
5. `0081_sakaba_intro_project_commands.sql`: 紹介と非公開プロジェクトの更新RPC。
6. 読み取り画面をモックからDBへ差し替える。
7. 書き込み操作をRPCへ差し替える。
8. シードデータ、E2Eテスト、プレゼン版との差分確認。

## 6. デモの固定先

- ブランチ: `demo/sakaba-mock-2026-09-21`
- タグ: `sakaba-demo-2026-09-21`
- 固定コミット: `f2207593aaa165c16225a22c5df3234d987e2ca1`

本番実装は `main` で進め、デモブランチにはマージしない。
