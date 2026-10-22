// Provider and navigation information only. Product records are read remotely.
import type { CatalogSnapshot } from "../types";
export const siteCatalog: CatalogSnapshot = {
  "checkedAt": "2026-09-13",
  "providers": [
    {
      "id": "provider-001",
      "slug": "nirvana",
      "name": "古晋富贵山庄",
      "english": "NIRVANA MEMORIAL PARK · KUCHING",
      "description": "从提前规划到即时需求，协助您了解不同选择。先找到您想了解的类别，再一起看看适合的安排。",
      "coverLabel": "园区环境主图预留",
      "sortOrder": 1,
      "status": "published",
      "resources": [
        {
          "title": "园区环境",
          "description": "园区整体介绍与环境照片"
        },
        {
          "title": "设施与服务",
          "description": "设施、道路及服务资讯"
        },
        {
          "title": "园区平面图",
          "description": "分区、阁位及设施位置"
        },
        {
          "title": "位置与交通",
          "description": "园区位置与到访路线"
        }
      ]
    },
    {
      "id": "provider-002",
      "slug": "yunnan-siantang",
      "name": "砂拉越云南善堂",
      "english": "SARAWAK HUN NAM SIANG TNG",
      "description": "需要帮助的时候，先把下一步了解清楚。这里为您整理云南善堂相关资讯，以及可进一步咨询的协助事项。",
      "coverLabel": "云南善堂建筑照片预留",
      "sortOrder": 2,
      "status": "published"
    }
  ],
  "categories": [
    {
      "id": "category-001",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "burial-plots",
      "name": "福地",
      "english": "Burial Plots",
      "description": "单人、双人、家族与火化土葬，为不同家庭了解合适的安置选择。",
      "sortOrder": 1,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "cards",
      "includeAll": true,
      "filterLabel": "选择类型"
    },
    {
      "id": "category-001-01",
      "providerId": "provider-001",
      "parentId": "category-001",
      "slug": "burial-plots-option-1",
      "name": "单人",
      "english": "Burial Plots",
      "description": "了解单人的相关选择。",
      "sortOrder": 1,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "单人"
      ]
    },
    {
      "id": "category-001-02",
      "providerId": "provider-001",
      "parentId": "category-001",
      "slug": "burial-plots-option-2",
      "name": "双人",
      "english": "Burial Plots",
      "description": "了解双人的相关选择。",
      "sortOrder": 2,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "双人"
      ]
    },
    {
      "id": "category-001-03",
      "providerId": "provider-001",
      "parentId": "category-001",
      "slug": "burial-plots-option-3",
      "name": "家族",
      "english": "Burial Plots",
      "description": "了解家族的相关选择。",
      "sortOrder": 3,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "家族"
      ]
    },
    {
      "id": "category-001-04",
      "providerId": "provider-001",
      "parentId": "category-001",
      "slug": "burial-plots-option-4",
      "name": "火化土葬",
      "english": "Burial Plots",
      "description": "了解火化土葬的相关选择。",
      "sortOrder": 4,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "火化土葬"
      ]
    },
    {
      "id": "category-002",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "columbaria",
      "name": "骨灰殿",
      "english": "Columbaria",
      "description": "聚仙楼、仁爱园、聚雅阁与腾黄阁，让思念有一个温柔的寄托。",
      "sortOrder": 2,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "cards",
      "includeAll": true,
      "filterLabel": "选择类型"
    },
    {
      "id": "category-002-01",
      "providerId": "provider-001",
      "parentId": "category-002",
      "slug": "columbaria-option-1",
      "name": "聚仙楼",
      "english": "Columbaria",
      "description": "了解聚仙楼的相关选择。",
      "sortOrder": 1,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "聚仙楼"
      ]
    },
    {
      "id": "category-002-02",
      "providerId": "provider-001",
      "parentId": "category-002",
      "slug": "columbaria-option-2",
      "name": "仁爱园",
      "english": "Columbaria",
      "description": "了解仁爱园的相关选择。",
      "sortOrder": 2,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "仁爱园"
      ]
    },
    {
      "id": "category-002-03",
      "providerId": "provider-001",
      "parentId": "category-002",
      "slug": "columbaria-option-3",
      "name": "聚雅阁",
      "english": "Columbaria",
      "description": "了解聚雅阁的相关选择。",
      "sortOrder": 3,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "聚雅阁"
      ]
    },
    {
      "id": "category-002-04",
      "providerId": "provider-001",
      "parentId": "category-002",
      "slug": "columbaria-option-4",
      "name": "腾黄阁",
      "english": "Columbaria",
      "description": "了解腾黄阁的相关选择。",
      "sortOrder": 4,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "腾黄阁"
      ]
    },
    {
      "id": "category-003",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "funeral-services",
      "name": "殡仪服务",
      "english": "Funeral Services",
      "description": "按信仰与仪式需求，了解不同殡仪服务配套。",
      "sortOrder": 3,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "comparison",
      "includeAll": false,
      "filterLabel": "选择信仰 / 仪式需求",
      "defaultFilterId": "category-003-01",
      "inquiryOption": {
        "id": "inquiry-001",
        "label": "其他 / 咨询",
        "subject": "其他信仰 / 仪式需求",
        "description": "其他信仰与仪式需求，欢迎先咨询确认适合的安排。"
      }
    },
    {
      "id": "category-003-01",
      "providerId": "provider-001",
      "parentId": "category-003",
      "slug": "funeral-services-option-1",
      "name": "佛教",
      "english": "Funeral Services",
      "description": "了解佛教的相关选择。",
      "sortOrder": 1,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "佛教"
      ]
    },
    {
      "id": "category-003-02",
      "providerId": "provider-001",
      "parentId": "category-003",
      "slug": "funeral-services-option-2",
      "name": "基督教",
      "english": "Funeral Services",
      "description": "了解基督教的相关选择。",
      "sortOrder": 2,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "基督教"
      ]
    },
    {
      "id": "category-004",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "pedestal-tablets",
      "name": "神主灵位",
      "english": "Pedestal Tablets",
      "description": "了解富贵殿的神主灵位与纪念安排。",
      "sortOrder": 4,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "cards",
      "includeAll": true,
      "filterLabel": "选择类型"
    },
    {
      "id": "category-005",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "sheng-ji",
      "name": "生基园",
      "english": "Sheng Ji Garden",
      "description": "龙龟生基园的项目介绍与规划资讯。",
      "sortOrder": 5,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "cards",
      "includeAll": true,
      "filterLabel": "选择类型"
    },
    {
      "id": "category-006",
      "providerId": "provider-001",
      "parentId": null,
      "slug": "pet-memorial",
      "name": "宠物纪念",
      "english": "Pet Memorial",
      "description": "宠物也是家人。了解土葬、骨灰安置与相关服务。",
      "sortOrder": 6,
      "status": "published",
      "showInCatalog": true,
      "displayMode": "cards",
      "includeAll": true,
      "filterLabel": "选择类型"
    },
    {
      "id": "category-006-01",
      "providerId": "provider-001",
      "parentId": "category-006",
      "slug": "pet-memorial-option-1",
      "name": "土葬",
      "english": "Pet Memorial",
      "description": "了解土葬的相关选择。",
      "sortOrder": 1,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "土葬"
      ]
    },
    {
      "id": "category-006-02",
      "providerId": "provider-001",
      "parentId": "category-006",
      "slug": "pet-memorial-option-2",
      "name": "骨灰阁",
      "english": "Pet Memorial",
      "description": "了解骨灰阁的相关选择。",
      "sortOrder": 2,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "骨灰阁"
      ]
    },
    {
      "id": "category-006-03",
      "providerId": "provider-001",
      "parentId": "category-006",
      "slug": "pet-memorial-option-3",
      "name": "其他服务",
      "english": "Pet Memorial",
      "description": "了解其他服务的相关选择。",
      "sortOrder": 3,
      "status": "published",
      "showInCatalog": false,
      "legacyFilterValues": [
        "其他服务"
      ]
    }
  ],
  "products": [],
  "productCategories": [
    {
      "productId": "product-001",
      "categoryId": "category-001",
      "sortOrder": 1
    },
    {
      "productId": "product-001",
      "categoryId": "category-001-02",
      "sortOrder": 1
    },
    {
      "productId": "product-001",
      "categoryId": "category-001-04",
      "sortOrder": 1
    },
    {
      "productId": "product-002",
      "categoryId": "category-001",
      "sortOrder": 2
    },
    {
      "productId": "product-002",
      "categoryId": "category-001-02",
      "sortOrder": 2
    },
    {
      "productId": "product-002",
      "categoryId": "category-001-04",
      "sortOrder": 2
    },
    {
      "productId": "product-003",
      "categoryId": "category-001",
      "sortOrder": 3
    },
    {
      "productId": "product-003",
      "categoryId": "category-001-01",
      "sortOrder": 1
    },
    {
      "productId": "product-004",
      "categoryId": "category-001",
      "sortOrder": 4
    },
    {
      "productId": "product-004",
      "categoryId": "category-001-02",
      "sortOrder": 3
    },
    {
      "productId": "product-005",
      "categoryId": "category-001",
      "sortOrder": 5
    },
    {
      "productId": "product-005",
      "categoryId": "category-001-02",
      "sortOrder": 4
    },
    {
      "productId": "product-006",
      "categoryId": "category-001",
      "sortOrder": 6
    },
    {
      "productId": "product-006",
      "categoryId": "category-001-01",
      "sortOrder": 2
    },
    {
      "productId": "product-007",
      "categoryId": "category-001",
      "sortOrder": 7
    },
    {
      "productId": "product-007",
      "categoryId": "category-001-02",
      "sortOrder": 5
    },
    {
      "productId": "product-008",
      "categoryId": "category-001",
      "sortOrder": 8
    },
    {
      "productId": "product-008",
      "categoryId": "category-001-03",
      "sortOrder": 1
    },
    {
      "productId": "product-009",
      "categoryId": "category-001",
      "sortOrder": 9
    },
    {
      "productId": "product-009",
      "categoryId": "category-001-03",
      "sortOrder": 2
    },
    {
      "productId": "product-010",
      "categoryId": "category-002",
      "sortOrder": 1
    },
    {
      "productId": "product-010",
      "categoryId": "category-002-01",
      "sortOrder": 1
    },
    {
      "productId": "product-011",
      "categoryId": "category-002",
      "sortOrder": 2
    },
    {
      "productId": "product-011",
      "categoryId": "category-002-01",
      "sortOrder": 2
    },
    {
      "productId": "product-012",
      "categoryId": "category-002",
      "sortOrder": 3
    },
    {
      "productId": "product-012",
      "categoryId": "category-002-01",
      "sortOrder": 3
    },
    {
      "productId": "product-013",
      "categoryId": "category-002",
      "sortOrder": 4
    },
    {
      "productId": "product-013",
      "categoryId": "category-002-01",
      "sortOrder": 4
    },
    {
      "productId": "product-014",
      "categoryId": "category-002",
      "sortOrder": 5
    },
    {
      "productId": "product-014",
      "categoryId": "category-002-02",
      "sortOrder": 1
    },
    {
      "productId": "product-015",
      "categoryId": "category-002",
      "sortOrder": 6
    },
    {
      "productId": "product-015",
      "categoryId": "category-002-03",
      "sortOrder": 1
    },
    {
      "productId": "product-016",
      "categoryId": "category-002",
      "sortOrder": 7
    },
    {
      "productId": "product-016",
      "categoryId": "category-002-04",
      "sortOrder": 1
    },
    {
      "productId": "product-017",
      "categoryId": "category-004",
      "sortOrder": 1
    },
    {
      "productId": "product-018",
      "categoryId": "category-005",
      "sortOrder": 1
    },
    {
      "productId": "product-019",
      "categoryId": "category-003",
      "sortOrder": 1
    },
    {
      "productId": "product-019",
      "categoryId": "category-003-01",
      "sortOrder": 1
    },
    {
      "productId": "product-020",
      "categoryId": "category-003",
      "sortOrder": 2
    },
    {
      "productId": "product-020",
      "categoryId": "category-003-01",
      "sortOrder": 2
    },
    {
      "productId": "product-021",
      "categoryId": "category-003",
      "sortOrder": 3
    },
    {
      "productId": "product-021",
      "categoryId": "category-003-01",
      "sortOrder": 3
    },
    {
      "productId": "product-022",
      "categoryId": "category-003",
      "sortOrder": 4
    },
    {
      "productId": "product-022",
      "categoryId": "category-003-01",
      "sortOrder": 4
    },
    {
      "productId": "product-023",
      "categoryId": "category-003",
      "sortOrder": 5
    },
    {
      "productId": "product-023",
      "categoryId": "category-003-02",
      "sortOrder": 1
    },
    {
      "productId": "product-024",
      "categoryId": "category-003",
      "sortOrder": 6
    },
    {
      "productId": "product-024",
      "categoryId": "category-003-02",
      "sortOrder": 2
    },
    {
      "productId": "product-025",
      "categoryId": "category-003",
      "sortOrder": 7
    },
    {
      "productId": "product-025",
      "categoryId": "category-003-02",
      "sortOrder": 3
    },
    {
      "productId": "product-026",
      "categoryId": "category-003",
      "sortOrder": 8
    },
    {
      "productId": "product-026",
      "categoryId": "category-003-02",
      "sortOrder": 4
    },
    {
      "productId": "product-027",
      "categoryId": "category-006",
      "sortOrder": 1
    },
    {
      "productId": "product-027",
      "categoryId": "category-006-01",
      "sortOrder": 1
    },
    {
      "productId": "product-028",
      "categoryId": "category-006",
      "sortOrder": 2
    },
    {
      "productId": "product-028",
      "categoryId": "category-006-02",
      "sortOrder": 1
    },
    {
      "productId": "product-029",
      "categoryId": "category-006",
      "sortOrder": 3
    },
    {
      "productId": "product-029",
      "categoryId": "category-006-03",
      "sortOrder": 1
    }
  ]
};
