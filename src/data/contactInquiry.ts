export type ContactInquiry = { name: string; service: string; message: string; callback: boolean; phone: string };
export const callbackPhonePattern = String.raw`\+?(?:[\s\(\)\-]*[0-9]){7,15}[\s\(\)\-]*`;
export function contactInquiryMessage(values: ContactInquiry): string {
  const details = [
    values.name.trim() && `称呼：${values.name.trim()}`,
    values.service.trim() && `咨询方向：${values.service.trim()}`,
    values.message.trim() && `咨询内容：${values.message.trim()}`,
    values.callback && '回电意愿：希望顾问电话联系我',
    values.callback && values.phone.trim() && `联系电话：${values.phone.trim()}`,
  ].filter(Boolean);
  return details.length ? ['您好，我想了解相关服务。', ...details, '麻烦提供进一步资料，谢谢。'].join('\n\n') : '您好，我想咨询富贵山庄或云南善堂的相关服务。';
}
