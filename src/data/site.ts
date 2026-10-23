// Fill only with contact information verified by the site owner.
export const advisor = {
  name: "",
  title: "身后规划与服务顾问",
  agentNumber: "",
  experience: "",
  languages: "",
  phone: "",
  whatsapp: "+60 19-818 6134",
  whatsappRecipient: "+60 14-586 6878",
  whatsappSecondary: "+60 16-776 0560",
  email: "",
  businessHours: "24小时",
  serviceArea: "古晋 · 砂拉越",
};
export const navigation = [
  { label: "首页", to: "/" },
  { label: "富贵山庄", to: "/nirvana" },
  { label: "云南善堂", to: "/yunnan-siantang" },
  { label: "关于服务", to: "/about" },
  { label: "联系代理", to: "/contact" },
];
export function whatsappUrl(message: string, recipient = advisor.whatsappRecipient) {
  const number = recipient.replace(/\D/g, "");
  return /^\d{8,15}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : null;
}
export const principles = [
  {
    title: "尊重信仰",
    description: "尊重不同的信仰、文化与习俗",
  },
  {
    title: "多元选择",
    description: "了解不同的服务与安置方式",
  },
  {
    title: "循序了解",
    description: "按自己的节奏，逐步了解服务",
  },
  {
    title: "从容决定",
    description: "留出商量的时间，尊重家庭决定",
  },
];
export const assistance = [
  {
    slug: "consultation",
    title: "殡葬咨询",
    text: "整理家属当前的疑问，了解希望采用的仪式与安排。",
  },
  {
    slug: "process",
    title: "流程说明",
    text: "预留文件准备、办理顺序与相关注意事项的说明位置。",
  },
  {
    slug: "family",
    title: "家属协助",
    text: "预留联络协调、家属沟通与陪同事项的介绍位置。",
  },
  {
    slug: "aftercare",
    title: "后续安排",
    text: "预留纪念、安置及其他后续事项的说明位置。",
  },
];
