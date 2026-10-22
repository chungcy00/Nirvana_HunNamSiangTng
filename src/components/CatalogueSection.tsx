import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCatalog } from "../catalog/context";
import { categoryPath } from "../catalog/repository";
import { Placeholder } from "./Placeholder";
import { SectionHeading } from "./ui";
import type { Provider } from "../types";

export default function CatalogueSection({ provider }: { provider: Provider }) {
  const catalog = useCatalog();
  const categories = catalog.getCatalogCategories(provider.id);
  return (
    <section id="categories" className="container section">
      <SectionHeading
        eyebrow="PLANNING OPTIONS"
        title="您想了解哪一类？"
        text="按需要浏览，不必一次了解所有产品。"
      />
      {categories.length ? (
        <div className="grid-three categories-grid">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={categoryPath(provider.slug, category.slug)}
              className="card category-card"
            >
              <Placeholder label={`${category.name}图片预留`} />
              <div className="card-body">
                <div className="card-meta">
                  <span>
                    {String(index + 1).padStart(2, "0")} / {category.english}
                  </span>
                  <span>{catalog.getProducts(category.id).length} 项选择</span>
                </div>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
                <span className="text-link">
                  查看选择 <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="content-slot">
          <p>产品目录待补充</p>
          <span>确认后的服务与产品将在这里展示。</span>
        </div>
      )}
    </section>
  );
}
