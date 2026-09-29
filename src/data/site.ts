// Fill only with contact information verified by the site owner.
export const advisor = {
  name: "",
  title: "身后规划与服务顾问",
  agentNumber: "",
  experience: "",
  languages: "",
  phone: "",
  whatsapp: "",
  email: "",
  businessHours: "",
  serviceArea: "古晋 · 砂拉越",
};
export const navigation = [
  { label: "首页", to: "/" },
  { label: "富贵山庄", to: "/nirvana" },
  { label: "云南善堂", to: "/yunnan-siantang" },
  { label: "关于服务", to: "/about" },
  { label: "联系代理", to: "/contact" },
];
export function whatsappUrl(message: string) {
  const number = advisor.whatsapp.replace(/\D/g, "");
  return /^\d{8,15}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : null;
}
export const principles = [
  {
    title: "敬重所信",
    description: "敬畏不同的信仰、文化与习俗，理解每一份安排背后的深情",
  },
  {
    title: "随心而择",
    description: "从心出发，寻找最契合的服务与安置方式",
  },
  {
    title: "缓步悉知",
    description: "缓步梳理服务与流程，让每一次选择都心中有数",
  },
  {
    title: "安然定夺",
    description: "先倾听内心的声音，再安然规划往后的安排",
  },
];
export const aboutPrinciples = [
  { title: "专业咨询", description: "把复杂的安排，解释得清楚易懂。" },
  { title: "多元选择", description: "尊重每个家庭的信仰、文化与预算。" },
  { title: "安心规划", description: "先了解需要，再一起考虑合适选择。" },
  { title: "温暖陪伴", description: "从初次了解，到每一步的安排。" },
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
