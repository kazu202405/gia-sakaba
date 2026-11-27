import { BIZ_UDPGothic, Zen_Kaku_Gothic_New } from "next/font/google";

const body = BIZ_UDPGothic({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-sn-body", display: "swap" });
const heading = Zen_Kaku_Gothic_New({ weight: ["500", "700", "900"], subsets: ["latin"], variable: "--font-sn-head", display: "swap" });

export const snsFontClass = [body.variable, heading.variable].join(" ");
