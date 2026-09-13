import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { categories, products } from "../data/catalog";
import {
  PageHero,
  SectionHeading,
  Placeholder,
  ContactCTA,
} from "../components/ui";
export default function Nirvana() {
  return (
    <>
      <PageHero
        eyebrow="NIRVANA MEMORIAL PARK · KUCHING"
        title="古晋富贵山庄"
        text="从提前规划到即时需求，协助您了解不同选择。先找到您想了解的类别，再一起看看适合的安排。"
        imageLabel="园区环境主图预留"
      >
        <a className="text-link" href="#categories">
          探索六大类别 <ArrowRight size={17} />
        </a>
      </PageHero>
      <section id="categories" className="container section">
        <SectionHeading
          eyebrow="PLANNING OPTIONS"
          title="您想了解哪一类？"
          text="按需要浏览，不必一次了解所有产品。"
        />
        <div className="grid-three categories-grid">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              to={`/nirvana/${category.id}`}
              className="card category-card"
            >
              <Placeholder label={`${category.name}图片预留`} />
              <div className="card-body">
                <div className="card-meta">
                  <span>
                    0{i + 1} / {category.english}
                  </span>
                  <span>
                    {
                      products.filter((p) => p.categoryId === category.id)
                        .length
                    }{" "}
                    项选择
                  </span>
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
      </section>
      <section className="soft-section">
        <div className="container section">
          <SectionHeading
            eyebrow="GET TO KNOW THE PARK"
            title="了解园区"
            text="产品之外，也为您留好园区环境与实用资讯的位置。"
          />
          <div className="grid-four resources">
            {[
              ["园区环境", "园区整体介绍与环境照片", "about-nirvana"],
              ["设施与服务", "设施、道路及服务资讯", "facilities-services"],
              ["园区平面图", "分区、阁位及设施位置", "site-plan"],
              ["位置与交通", "园区位置与到访路线", "location-map"],
            ].map(([title, text, path]) => (
              <article className="card" key={path}>
                <Placeholder label={`${title}预留`} />
                <div className="card-body">
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a
                    className="text-link"
                    href={`https://www.nirvanakuching.com/${path}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    查看参考资讯 <ArrowUpRight size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <p className="source-note">
            参考资讯来自 Nirvana Kuching 025 Agency。本站展示图片均为预留位置。
          </p>
        </div>
      </section>
      <ContactCTA />
    </>
  );
}
