# Supabase スキーマ管理

このディレクトリには network_app の Supabase スキーマ定義を SQL で置いています。

## 適用手順（初回）

1. Supabase ダッシュボードを開く
2. 左メニューの「**SQL Editor**」をクリック
3. `migrations/0001_initial_schema.sql` の中身を全文コピー
4. SQL Editor に貼り付けて「**Run**」をクリック
5. エラーなく完了したら、左メニュー「**Table Editor**」で `seminars` `applicants` `event_attendees` の3テーブルが見えるはず

## 主催者ユーザーの作成

スキーマ適用後：

1. 左メニュー「**Authentication**」→「**Users**」
2. 右上「**Add user**」→「**Send invitation**」または「**Create user**」
3. メアド：`global.information.academy@gmail.com`
4. パスワード：任意の強いパスワード（管理者が記憶／パスワードマネージャーへ）
5. 「**Auto Confirm User**」ON で即時アクティブ化

このメアドが `is_admin()` 関数で「管理者」と判定される。

## seminars にデータを入れる方法

Table Editor → seminars テーブル → 「Insert row」で1件ずつ入力 OR
SQL Editor で：

```sql
INSERT INTO seminars (slug, title, date, start_time, end_time, location, description, line_group_url, event_type)
VALUES (
  'vol-1-2026-05-26',
  '紹介獲得セミナー 第1回',
  '2026-05-26',
  '19:00',
  '21:00',
  '大阪・本町 ◯◯◯◯',
  '紹介が起こる仕組みと、属人化しない会社の作り方',
  'https://line.me/...（実際のグループURL）',
  'seminar'
);
```

`slug` が招待URL（`/join?invite=<slug>`）の識別子になる。

## RLS（行レベルセキュリティ）の確認

スキーマ適用後、Table Editor で各テーブルの右上に「RLS」の有効化マークが出ているか確認。
出ていない場合は SQL Editor で以下を実行：

```sql
ALTER TABLE seminars ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
```

## 中期以降の追加カラム

`applicants` テーブルには将来の本登録UI 用の項目を予め用意済み：
- job_title, role_title, headline
- story_origin, story_turning_point, story_now, story_future
- want_to_connect_with

不足が出たら ALTER TABLE で追加：

```sql
ALTER TABLE applicants ADD COLUMN values TEXT;
ALTER TABLE applicants ADD COLUMN status_message TEXT;
```

## マイグレーション運用ルール

- スキーマ変更は必ず新規ファイル `0002_*.sql`, `0003_*.sql` として追加
- 既存ファイルは編集しない（履歴を保つ）
- ファイル名は連番 + 内容（例：`0002_add_profile_columns.sql`）
