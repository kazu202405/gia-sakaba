-- 建設・不動産の酒場の案件から「問い合わせ先」の入力をなくす（2026-11-28 五島さん決定）。
-- 連絡は案件ページの返信で受けるため。電話・メールが公開範囲の全員に出るのも避ける。
-- 既存の行は消さない。新しい案件は contact を null で保存できるようにするだけ。
-- 今の画面（問い合わせ先を送る版）もそのまま動くので、画面の更新より先に当ててよい。
begin;

alter table sakaba.construction_posts
  alter column contact drop not null,
  drop constraint construction_posts_contact_check,
  add constraint construction_posts_contact_check
    check (contact is null or char_length(btrim(contact)) between 1 and 300);

commit;
