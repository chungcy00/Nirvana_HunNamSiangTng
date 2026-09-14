import { useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCatalog } from "../catalog/context";
import CatalogueSection from "../components/CatalogueSection";
import {
  PageHero,
  SectionHeading,
  Placeholder,
  ContactCTA,
  NotFound,
} from "../components/ui";

// Shared provider catalogue template; new providers do not need a new page component.
export default function Nirvana() {
  const { providerSlug } = useParams();
  const catalog = useCatalog();
  const provider = catalog.getProviderBySlug(providerSlug || "");
  if (!provider) return <NotFound />;
  return (
    <>
      <PageHero
        eyebrow={provider.english}
        title={provider.name}
        text={provider.description}
        imageLabel={provider.coverLabel}
      >
        <a className="text-link" href="#categories">
          探索产品类别 <ArrowRight size={17} />
        </a>
      </PageHero>
      <CatalogueSection provider={provider} />
      {!!provider.resources?.length && (
        <section className="soft-section">
          <div className="container section">
            <SectionHeading
              eyebrow="GET TO KNOW THE PARK"
              title="了解园区"
              text="产品之外，也为您留好园区环境与实用资讯的位置。"
            />
            <div className="grid-four resources">
              {provider.resources.map((item) => (
                <article className="card" key={item.title}>
                  <Placeholder label={`${item.title}预留`} />
                  <div className="card-body">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <p className="small muted">详细资讯待补充</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="source-note">
              园区资讯与图片均为预留位置，待资料确认后补充。
            </p>
          </div>
        </section>
      )}
      <ContactCTA />
    </>
  );
}
