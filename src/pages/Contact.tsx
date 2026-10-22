import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";
import { advisor, whatsappUrl } from "../data/site";
import { callbackPhonePattern, contactInquiryMessage } from "../data/contactInquiry";
import NeedsQuestionnaire from "../components/NeedsQuestionnaire";
import { PageHero } from "../components/ui";

const serviceChoices = [
  "骨灰位",
  "火化土葬",
  "传统土葬",
  "殡仪服务",
  "神主灵位",
  "宠物纪念",
  "其他咨询",
];

export default function Contact() {
  const [params] = useSearchParams();
  const requested = params.get("service") || "";
  const requestedCategory = serviceChoices.includes(requested) ? requested : "";
  const [service, setService] = useState(requestedCategory);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [callback, setCallback] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const phoneErrorText = "请输入包含 7 至 15 个数字的电话号码，可包含 +、空格、括号或连字符。";
  useEffect(() => { setService(requestedCategory); }, [requestedCategory]);
  const inquiry = contactInquiryMessage({ name, service, message, callback, phone });
  const whatsappAction = whatsappUrl("")?.split("?")[0];
  return (
    <>
      <PageHero
        eyebrow="LET’S TALK, AT YOUR PACE"
        title="让我们，从一次对话开始"
        text="无论是提前了解，还是眼前的需要，都可以先说说您的情况。"
      />
      <section className="container contact-layout section">
        <div className="contact-information">
          <p className="eyebrow">GET IN TOUCH</p>
          <h2>欢迎与我联系</h2>
          <p className="muted">选择您觉得自在的方式，开始了解。</p>
          <div className="contact-items">
            <div className="contact-item contact-whatsapp">
              <MessageCircle size={20} strokeWidth={1.4} />
              <div className="contact-whatsapp-numbers">
                <div>
                  <span>WhatsApp 第一联系方式</span>
                  <a href={whatsappUrl("您好，我想咨询相关服务。") || ""}>{advisor.whatsapp}</a>
                </div>
                <div>
                  <span>WhatsApp 第二联系方式</span>
                  <a href={whatsappUrl("您好，我想咨询相关服务。", advisor.whatsappSecondary) || ""}>{advisor.whatsappSecondary}</a>
                </div>
              </div>
            </div>
            {[
              {
                icon: MapPin,
                label: "服务地区",
                value: advisor.serviceArea,
                href: "",
              },
              {
                icon: Clock,
                label: "联系时间",
                value: advisor.businessHours,
                href: "",
              },
            ].map((item) => (
              <div className="contact-item" key={item.label}>
                <item.icon size={20} strokeWidth={1.4} />
                <div>
                  <span>{item.label}</span>
                  {item.href ? (
                    <a href={item.href}>{item.value}</a>
                  ) : (
                    <p>{item.value || "待补充"}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card contact-form" id="inquiry-form" tabIndex={-1} aria-labelledby="inquiry-title">
          <p className="eyebrow">MAKE THE FIRST STEP</p>
          <h2 id="inquiry-title">直接咨询顾问</h2>
          <p className="muted small">简单说说您的需要，即可联系顾问，无需先填写下方问卷。</p>
          <form action={whatsappAction} method="get" target="_blank" rel="noopener noreferrer">
            <input type="hidden" name="text" value={inquiry} />
            <div className="form-row">
              <label htmlFor="name">
                称呼 <small>（选填）</small>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="您的称呼"
                />
              </label>
              {callback && <label htmlFor="phone">
                联系电话 <span>*</span>
                <input
                  id="phone"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (phoneError && event.target.validity.valid) setPhoneError("");
                  }}
                  onInvalid={(event) => {
                    event.preventDefault();
                    setPhoneError(phoneErrorText);
                    event.currentTarget.focus();
                  }}
                  onBlur={(event) => {
                    if (event.target.value || phoneError) setPhoneError(event.target.validity.valid ? "" : phoneErrorText);
                  }}
                  aria-invalid={phoneError ? true : undefined}
                  aria-describedby={phoneError ? "phone-error" : undefined}
                  type="tel"
                  required
                  pattern={callbackPhonePattern}
                  title="请输入包含 7 至 15 个数字的电话号码，可包含 +、空格、括号或连字符"
                  maxLength={24}
                  autoComplete="tel"
                  placeholder="您的手机号码"
                />
                {phoneError && <span id="phone-error" className="contact-field-error" role="alert">{phoneError}</span>}
              </label>}
            </div>
            <label className="callback-choice">
              <input type="checkbox" checked={callback} onChange={(event) => {
                setCallback(event.target.checked);
                if (!event.target.checked) { setPhone(""); setPhoneError(""); }
              }} />
              希望顾问电话联系我
            </label>
            <label htmlFor="service">
              想咨询的服务 <small>（选填）</small>
              <select
                id="service"
                value={service}
                onChange={(event) => setService(event.target.value)}
              >
                <option value="">请选择一项服务</option>
                {serviceChoices.map((choice) => (
                  <option key={choice}>{choice}</option>
                ))}
              </select>
            </label>
            <label htmlFor="message">
              留言内容 <small>（选填）</small>
              <textarea
                id="message"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="例如：想先了解配套选择、预算或相关流程……"
              />
            </label>
            <button className="button" type="submit">
              前往 WhatsApp 咨询 <ArrowRight size={17} />
            </button>
            <p className="small muted">咨询内容将带入对话框，由您确认后发送。</p>
          </form>
        </div>
      </section>
      <NeedsQuestionnaire />
    </>
  );
}
