import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";
import { advisor, whatsappUrl } from "../data/site";
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
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setService(requestedCategory);
    setPreview("");
    setCopied(false);
  }, [requestedCategory]);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = `您好，我想咨询「${service}」。\n姓名：${String(data.get("name")).trim()}\n联系电话：${String(data.get("phone")).trim()}\n${String(data.get("message")).trim()}`;
    setPreview(text);
    setCopied(false);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  const url = whatsappUrl(preview);
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
          <h2>从这里，说明您的需要</h2>
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
          <div className="contact-note">
            {whatsappUrl("")
              ? "咨询内容会由您在 WhatsApp 中确认后发送。"
              : "联系资料暂未填入。当前可预览咨询内容，正式联系方式补充后即可发送。"}
          </div>
        </div>
        <div className="card contact-form" id="inquiry-form" tabIndex={-1} aria-labelledby="inquiry-title">
          <p className="eyebrow">MAKE THE FIRST STEP</p>
          <h2 id="inquiry-title">您想了解什么？</h2>
          <p className="muted small">先整理您的问题，按自己的节奏开始。</p>
          <form
            onSubmit={prepare}
            onChange={() => {
              setPreview("");
              setCopied(false);
            }}
          >
            <div className="form-row">
              <label htmlFor="name">
                姓名 <span>*</span>
                <input
                  id="name"
                  name="name"
                  required
                  pattern=".*\S.*"
                  maxLength={80}
                  autoComplete="name"
                  placeholder="您的称呼"
                />
              </label>
              <label htmlFor="phone">
                联系电话 <span>*</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  pattern="[+0-9 ()-]{7,24}"
                  title="请输入 7 至 24 位的电话号码，可包含 +、空格或连字符"
                  maxLength={24}
                  autoComplete="tel"
                  placeholder="您的手机号码"
                />
              </label>
            </div>
            <label htmlFor="service">
              想咨询的服务 <span>*</span>
              <select
                id="service"
                value={service}
                onChange={(event) => setService(event.target.value)}
                required
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
                name="message"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="例如：想先了解配套选择、预算或相关流程……"
              />
            </label>
            <p className="small muted">
              内容仅在当前页面整理，不会自动发送或储存。
            </p>
            <button className="button" type="submit">
              预览咨询内容 <ArrowRight size={17} />
            </button>
          </form>
          {preview && (
            <div className="inquiry-preview" role="status">
              <h3>咨询内容已整理，尚未发送</h3>
              <pre>{preview}</pre>
              <div className="button-row">
                {url && (
                  <a
                    className="button"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    打开 WhatsApp 继续
                  </a>
                )}
                <button
                  type="button"
                  className="button button-outline"
                  onClick={copy}
                >
                  {copied ? "已复制" : "复制内容"}
                </button>
              </div>
              {!url && (
                <p className="small">
                  顾问 WhatsApp 号码待补充，当前无法发送咨询。
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      <NeedsQuestionnaire />
    </>
  );
}
