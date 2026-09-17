import type { Metadata } from "next";
import { HomeNotice } from "@/components/guild/home-notice";
import { HomeProjects } from "@/components/guild/home-projects";

// 親レイアウトの「| GIA」を付けない
export const metadata: Metadata = { title: { absolute: "GIAの酒場（見本）" } };

// ホーム＝自分の仕事の入口。ギルドで起きていることは数だけ出し、くわしくは おしらせ で見る
export default function GuildHomePage() {
  return (
    <div className="space-y-11">
      <HomeNotice />
      <HomeProjects />
    </div>
  );
}
