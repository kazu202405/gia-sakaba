"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { constructionCompany, constructionId, constructionPost, type ConstructionCompany, type ConstructionResult } from "./construction-forms";
import { constructionContext, constructionRows } from "./construction-server";

const readText = (form: FormData, field: string) => {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
};

async function call(name: string, args: Record<string, unknown>, failure: string) {
  const { db } = await constructionContext();
  const result = await db.rpc(name, args);
  if (result.error) console.error("[construction.write]", name, result.error.code);
  return result.error ? { error: failure } : { data: result.data };
}

export async function publishConstructionPost(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const parsed = constructionPost.safeParse({
    title: form.get("title"), category: form.get("category"), industry: form.get("industry"), body: form.get("body"),
    contact: form.get("contact"), areas: form.getAll("area"), visibility: form.get("visibility"), deadline: readText(form, "deadline"),
  });
  if (!parsed.success) return { error: "記入内容を確認してください。地域はひとつ以上選んでください。" };
  const post = parsed.data;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  if (post.deadline && post.deadline < today) return { error: "返事の期限は今日以降を選んでください。" };
  const result = await call("sakaba_construction_create_post", {
    p_title: post.title, p_category: post.category, p_industry: post.industry, p_body: post.body, p_contact: post.contact,
    p_prefectures: post.areas, p_visibility: post.visibility, p_deadline: post.deadline || null,
  }, "案件を投稿できませんでした。入力を確認し、もう一度お試しください。");
  if ("error" in result) return { error: result.error ?? "案件を投稿できませんでした。" };
  const id = constructionId.safeParse(result.data);
  if (!id.success) return { error: "投稿結果を確認できませんでした。案件一覧を確認してください。" };
  revalidatePath(store.path("/posts"));
  return { message: "案件を投稿しました。", href: store.path("/posts/" + id.data) };
}

export async function replyToConstructionPost(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const id = constructionId.safeParse(form.get("post_id"));
  const kind = z.enum(["can", "know"]).safeParse(form.get("kind"));
  const note = z.string().trim().min(1).max(200).safeParse(form.get("note"));
  if (!id.success || !kind.success || !note.success) return { error: "返信を200字以内で記入してください。" };
  const result = await call("sakaba_construction_reply", { p_post_id: id.data, p_kind: kind.data, p_note: note.data }, "この案件には返信できませんでした。");
  if ("error" in result) return { error: result.error ?? "返信できませんでした。" };
  revalidatePath(store.path("/posts"));
  revalidatePath(store.path("/posts/" + id.data));
  return { message: result.data ? "返信しました。" : "この種類の返信は送信済みです。" };
}

export async function withdrawConstructionPost(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const id = constructionId.safeParse(form.get("post_id"));
  if (!id.success) return { error: "案件を確認できませんでした。" };
  const result = await call("sakaba_construction_withdraw_post", { p_post_id: id.data }, "この案件は取り下げられませんでした。");
  if ("error" in result) return { error: result.error ?? "取り下げられませんでした。" };
  revalidatePath(store.path("/posts"));
  return { message: "案件を取り下げました。", href: store.path("/posts") };
}

export async function changeConstructionConnection(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const id = constructionId.safeParse(form.get("id"));
  const intent = z.enum(["request", "accept", "decline"]).safeParse(form.get("intent"));
  if (!id.success || !intent.success) return { error: "相手または操作を確認できませんでした。" };
  const result = intent.data === "request"
    ? await call("sakaba_construction_request_connection", { p_target_id: id.data }, "この会員につながりを申請できませんでした。")
    : await call("sakaba_construction_answer_connection", { p_connection_id: id.data, p_accept: intent.data === "accept" }, "この申請に返事できませんでした。");
  if ("error" in result) return { error: result.error ?? "つながりを更新できませんでした。" };
  revalidatePath(store.path("/network"));
  revalidatePath(store.path("/posts"));
  return { message: intent.data === "request" ? "つながりを申請しました。" : intent.data === "accept" ? "知り合いになりました。" : "申請を見送りました。" };
}

export async function requestConstructionIntro(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const via = constructionId.safeParse(form.get("via"));
  const route = constructionId.safeParse(form.get("route"));
  const note = z.string().trim().min(1).max(200).safeParse(form.get("note"));
  if (!via.success || !route.success || !note.success) return { error: "紹介の用件を200字以内で記入してください。" };
  const result = await call("sakaba_construction_request_intro", {
    p_introducer_id: via.data, p_route_id: route.data, p_note: note.data,
  }, "紹介を依頼できませんでした。同じ相手への依頼が進行中か確認してください。");
  if ("error" in result) return { error: result.error ?? "紹介を依頼できませんでした。" };
  revalidatePath(store.path("/network"));
  return { message: "紹介を依頼しました。", href: store.path("/network") };
}

export async function answerConstructionIntro(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const parsed = z.object({
    id: constructionId,
    answer: z.enum(["accept", "decline"]),
    note: z.string().trim().max(200),
    fee: z.enum(["", "none", "fixed", "percent", "discuss"]),
    value: z.string().trim().max(16),
  }).safeParse({ id: form.get("id"), answer: form.get("answer"), note: readText(form, "note"), fee: readText(form, "fee"), value: readText(form, "value") });
  if (!parsed.success) return { error: "返事の内容を確認してください。" };
  const { id, answer, note, fee, value } = parsed.data;
  const amount = fee === "fixed" || fee === "percent" ? Number(value) : null;
  if (amount !== null && (
    !Number.isFinite(amount) || (fee === "fixed" && (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000)) ||
    (fee === "percent" && (amount < 0.1 || amount > 50))
  )) return { error: "紹介料の金額または割合を確認してください。" };
  const result = await call("sakaba_construction_answer_intro", {
    p_introduction_id: id, p_accept: answer === "accept", p_note: note,
    p_fee_kind: fee || null, p_fee_value: amount,
  }, "この紹介に返事できませんでした。");
  if ("error" in result) return { error: result.error ?? "返事できませんでした。" };
  revalidatePath(store.path("/network"));
  revalidatePath(store.path("/posts"));
  return { message: answer === "accept" ? "承認しました。" : "辞退しました。" };
}

export async function setConstructionNetworkVisibility(form: FormData): Promise<ConstructionResult> {
  const { store } = await constructionContext();
  const level = z.enum(["open", "intro", "masked", "hidden", "default"]).safeParse(form.get("level"));
  const friend = constructionId.nullable().safeParse(readText(form, "friend") || null);
  if (!level.success || !friend.success) return { error: "公開範囲を確認してください。" };
  const result = await call("sakaba_construction_set_network_visibility", {
    p_level: level.data === "default" ? null : level.data, p_friend_id: friend.data,
  }, "人脈の公開範囲を保存できませんでした。");
  if ("error" in result) return { error: result.error ?? "保存できませんでした。" };
  revalidatePath(store.path("/network"));
  revalidatePath(store.path("/posts"));
  return { message: "人脈の公開範囲を保存しました。" };
}

export async function saveConstructionCompany(form: FormData): Promise<ConstructionResult> {
  const { store, userId } = await constructionContext();
  const parsed = constructionCompany.safeParse({
    name: form.get("name"), prefecture: form.get("prefecture"), industries: form.getAll("industry"), areas: form.getAll("area"),
    business: readText(form, "business"), website: readText(form, "website"), title: readText(form, "title"),
  });
  if (!parsed.success) return { error: "会社名、所在地、対応エリア、業種を確認してください。" };
  const { name, prefecture, industries, areas, business, website, title } = parsed.data;
  const myCompany = (await constructionRows<ConstructionCompany>("sakaba_construction_list_companies"))
    .find((company) => company.members.some((member) => member.user_id === userId));
  const license = { kind: readText(form, "license_kind").trim(), issuer: readText(form, "license_issuer").trim(), number: readText(form, "license_number").trim() };
  if (Object.values(license).some(Boolean) && (!license.kind || !license.issuer || !license.number)) {
    return { error: "許可・免許の種類、発行元、番号をすべて記入してください。" };
  }
  const licenses = [...(myCompany?.licenses ?? [])];
  if (license.kind && !licenses.some((item) => item.kind === license.kind && item.issuer === license.issuer && item.number === license.number)) {
    licenses.push({ ...license, verified: false });
  }
  const result = await call("sakaba_construction_save_my_company", {
    p_name: name, p_prefecture: prefecture, p_industries: industries, p_areas: areas, p_business: business,
    p_website: website, p_title: title, p_licenses: licenses.map(({ kind, issuer, number }) => ({ kind, issuer, number })),
  }, "会社情報を保存できませんでした。");
  if ("error" in result) return { error: result.error ?? "会社情報を保存できませんでした。" };
  revalidatePath(store.path("/network/company"));
  revalidatePath(store.path("/network"));
  return { message: "会社情報を保存しました。", href: store.path("/network") };
}
