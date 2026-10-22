import type { PrototypeProduct } from "./model";

// Fixed review fixtures, used by isolated tests only; never imported by the public website. Source: the supplied
// 富贵产品网站信息 DOCX files, checked on 2026-10-22. The user confirmed that all
// Zone W products support Buddhism and Christianity; package inclusions differ.
// The user confirmed Juxian niches are indoor and all other niches are outdoor.
// No network or database calls.
export const prototypeProducts: PrototypeProduct[] = [
  {
    id: "loving-kindness-2-single",
    name: "仁爱园 2.0 · 单人骨灰位",
    category: 3,
    visible: true,
    capacity: "single",
    placement: "outdoor",
    // Religion explicitly confirmed by the user on 2026-10-22.
    religions: [{ id: "1", name: "佛教", isPublished: true, inclusions: [], designs: [] }],
    inclusions: ["单人骨灰位", "骨灰瓮", "火化费用", "永久管理费"],
    offers: [{ name: "最低起价", amount: 6888 }],
    priceNote: "以上价格未包含印花税。",
  },
  {
    "id": "w-cremation",
    "name": "双人火化土葬配套 · W区",
    "category": 1,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [
          "香炉 × 1个"
        ],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [
          "花瓶 × 1对"
        ],
        "designs": []
      }
    ],
    "inclusions": [
      "双人福地一个",
      "墓碑",
      "骨灰瓮两个",
      "2×3英寸彩色瓷相两张",
      "火化费用两次"
    ],
    "offers": [
      {
        "name": "普通地段",
        "amount": 21888
      }
    ],
    "priceNote": "以上价格未包含印花税。",
    "capacity": "double",
    "facing": "西北",
    "area": 10.83
  },
  {
    "id": "w-family-lot",
    "name": "家庭福地 · W区",
    "category": 2,
    "visible": true,
    "capacity": "family",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "facing": "西北",
    "inclusions": [
      "土地",
      "管理费",
      "设施费用"
    ],
    "offers": [
      {
        "name": "普通地段 864 sqft",
        "amount": 238888,
        "area": 864
      },
      {
        "name": "角头地段 864 sqft",
        "amount": 258888,
        "area": 864
      },
      {
        "name": "普通地段 1080 sqft",
        "amount": 308888,
        "area": 1080
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "w-double-lot",
    "name": "双人福地地段 · W区",
    "category": 2,
    "visible": true,
    "capacity": "double",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "facing": "西北",
    "area": 216,
    "inclusions": [
      "土地",
      "永久性服务与维护",
      "围墙与步道"
    ],
    "offers": [
      {
        "name": "普通地段",
        "amount": 60888
      },
      {
        "name": "角头地段",
        "amount": 68888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "w-single-lot",
    "name": "单人福地地段 · W区",
    "category": 2,
    "visible": true,
    "capacity": "single",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "facing": "西北",
    "area": 108,
    "inclusions": [
      "土地",
      "维护费",
      "围墙与步道",
      "挖墓费用"
    ],
    "offers": [
      {
        "name": "普通地段",
        "amount": 27888
      },
      {
        "name": "角头地段",
        "amount": 30888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "w-single-package",
    "name": "单人福地配套 · W区",
    "category": 2,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [
          "香炉",
          "后土",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [
          "一对天使",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      }
    ],
    "inclusions": [
      "福地土地",
      "墓碑"
    ],
    "offers": [
      {
        "name": "普通地段",
        "amount": 33888
      },
      {
        "name": "角头地段",
        "amount": 35888
      }
    ],
    "priceNote": "以上价格未包含印花税。",
    "capacity": "single",
    "facing": "西北",
    "area": 75
  },
  {
    "id": "w-double-package",
    "name": "双人福地配套 · W区",
    "category": 2,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [
          "香炉",
          "后土",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [
          "一对天使",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      }
    ],
    "inclusions": [
      "福地土地",
      "墓碑"
    ],
    "offers": [
      {
        "name": "普通地段",
        "amount": 86888
      },
      {
        "name": "角头地段",
        "amount": 93888
      }
    ],
    "priceNote": "以上价格未包含印花税。",
    "capacity": "double",
    "facing": "西北",
    "area": 162
  },
  {
    "id": "w-premium-package",
    "name": "尊贵双人福地配套 · W区",
    "category": 2,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [
          "香炉",
          "后土",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [
          "一对天使",
          "花瓶",
          "彩色瓷相"
        ],
        "designs": []
      }
    ],
    "inclusions": [
      "福地土地",
      "墓碑"
    ],
    "offers": [
      {
        "name": "普通地段 216 sqft",
        "amount": 113888,
        "area": 216
      },
      {
        "name": "角头地段 216 sqft",
        "amount": 123888,
        "area": 216
      },
      {
        "name": "普通地段 252 sqft",
        "amount": 120888,
        "area": 252
      }
    ],
    "priceNote": "以上价格未包含印花税。",
    "capacity": "double",
    "facing": "西北"
  },
  {
    "id": "aa-double-package",
    "name": "双人火化土葬 · AA区",
    "category": 1,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": [
          "甲款",
          "乙款"
        ]
      },
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": [
          "丙款",
          "丁款"
        ]
      }
    ],
    "inclusions": [
      "双人福地",
      "风水建设",
      "双人火化费",
      "骨灰瓮及盒 × 2",
      "寿洞",
      "永久管理费",
      "第二次下葬费"
    ],
    "offers": [
      {
        "name": "默认方案",
        "amount": 63888
      }
    ],
    "priceNote": "以上价格未包含印花税。",
    "capacity": "double",
    "facing": "朝南",
    "area": 56
  },
  {
    "id": "funeral-1-1",
    "name": "富贵自由｜佛教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "3 天 2 夜佛教殡仪服务",
      "24 小时临终礼仪咨询",
      "申报死亡与领取死亡证书",
      "遗体接送：接体车 1 辆与接体人员",
      "遗体穿衣与化妆服务",
      "进口优质寿衣 1 套",
      "遗体冰箱",
      "陀罗尼经被 1 件",
      "富贵自由火化寿木 1 副",
      "风扇 1 台",
      "桌子及桌布 2 套",
      "椅子及椅套 30 套",
      "使用庄严灵堂",
      "灵桌花坛",
      "遗照放大（10R）1 张",
      "精致相框 1 个",
      "使用佛歌机",
      "路向指示牌",
      "孝服 12 套",
      "唁慰录 1 本",
      "使用吊金箱 1 个",
      "使用音响 1 套",
      "专业治丧资讯及服务团队 1 队",
      "殡仪协调人员 1 人",
      "治丧流程表",
      "入殓及安葬生肖相冲通告",
      "佛教诵经服务",
      "灵前供斋与供果 3 天",
      "元宝蜡烛 1 套",
      "糖果红包 100 份",
      "饮用水 5 箱",
      "专业扶柩队 1 队",
      "寿内用品",
      "入殓鲜花",
      "大殓封棺",
      "司仪 1 人",
      "使用进口豪华灵车 1 辆／单程",
      "做七及百日提醒",
      "追思优盘 1 份"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。仅限火化。",
    "preNeed": 10888,
    "atNeed": 12888
  },
  {
    "id": "funeral-1-2",
    "name": "富贵圆满｜佛教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "3 天 2 夜佛教殡仪服务",
      "24 小时临终礼仪咨询",
      "申报死亡与领取死亡证书",
      "遗体接送：接体车 1 辆与接体人员",
      "遗体穿衣与化妆服务",
      "进口优质寿衣 1 套",
      "遗体冰箱",
      "陀罗尼经被 1 件",
      "豪华棺木或火化棺木 1 副",
      "骨灰瓮 1 个",
      "殡仪馆使用 2 晚，或特色大棚（20 尺 × 20 尺）及灯光 1 组",
      "风扇 2 台",
      "桌子及桌布 4 套",
      "椅子及椅套 50 套",
      "使用庄严灵堂",
      "鲜花花坛",
      "使用佛歌机",
      "遗照放大（10R）1 张",
      "精致相框 1 个",
      "路向指示牌",
      "孝服 24 套",
      "唁慰录 1 本",
      "使用吊金箱 1 个",
      "使用追思屏风 1 个",
      "使用音响 1 套",
      "专业治丧协调顾问",
      "专业丧务理事",
      "殡仪协调人员（08:30－20:30）",
      "治丧流程表",
      "入殓及安葬生肖相冲通告",
      "佛教诵经服务",
      "水果素菜祭品 3 天",
      "元宝蜡烛 1 套",
      "精致纸扎 1 套",
      "糖果红包 200 份",
      "饮用水 10 箱",
      "专业扶柩队 1 队",
      "寿内用品",
      "入殓鲜花",
      "大殓封棺",
      "司仪 1 人",
      "礼仪助理 2 人",
      "纪念品 50 份",
      "引导车 1 辆／单程",
      "使用进口豪华灵车 1 辆／单程",
      "使用冷气巴士（40 座）1 辆",
      "做七及百日提醒",
      "追思优盘（80 张相片）1 份"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 23888,
    "atNeed": 26888
  },
  {
    "id": "funeral-1-3",
    "name": "富贵尊荣｜佛教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "3 天 2 夜佛教殡仪服务",
      "24 小时临终礼仪咨询",
      "申报死亡与领取死亡证书",
      "遗体接送：接体车 1 辆与接体人员",
      "遗体穿衣与化妆服务",
      "进口优质寿衣 1 套",
      "遗体冰箱",
      "陀罗尼经被 1 件",
      "豪华棺木或火化棺木 1 副",
      "骨灰瓮 1 个",
      "殡仪馆或特色大棚（20 尺 × 20 尺）及灯光 2 组",
      "风扇 6 台",
      "桌子及桌布 8 套",
      "椅子及椅套 100 套",
      "使用庄严灵堂",
      "鲜花花坛",
      "遗照放大（12R）1 张",
      "精致相框 1 个",
      "雕柱鲜花",
      "使用佛歌机",
      "路向指示牌",
      "孝服 48 套",
      "唁慰录 1 本",
      "使用吊金箱 1 个",
      "使用追思屏风 1 个",
      "使用音响 1 套",
      "专业治丧协调顾问",
      "专业丧务理事",
      "殡仪协调人员（08:30－20:30）",
      "佛教诵经服务",
      "治丧流程表",
      "入殓及安葬生肖相冲通告",
      "水果素菜祭品 3 天",
      "元宝蜡烛 1 套",
      "精致纸扎 1 套",
      "糖果红包 300 份",
      "饮用水 30 箱",
      "花生 40 包",
      "专业扶柩队 1 队",
      "寿内用品",
      "入殓鲜花",
      "大殓封棺",
      "司仪 1 人",
      "礼仪助理 2 人",
      "纪念品 150 份",
      "引导车 1 辆／单程",
      "使用进口豪华皇家灵车 1 辆／单程",
      "使用冷气巴士（40 座）1 辆／单程",
      "罗里载花圈 1 辆",
      "做七及百日提醒",
      "追思相册及优盘（120 张相片）1 份"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 35888,
    "atNeed": 40888
  },
  {
    "id": "funeral-1-4",
    "name": "富贵辉煌｜佛教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "3 天 2 夜佛教殡仪服务",
      "24 小时临终礼仪咨询",
      "申报死亡与领取死亡证书",
      "遗体接送：接体车 1 辆与接体人员",
      "遗体穿衣与化妆服务",
      "进口优质寿衣 1 套",
      "遗体冰箱",
      "陀罗尼经被 1 件",
      "豪华棺木或火化棺木 1 副",
      "骨灰瓮 1 个",
      "殡仪馆或特色大棚（20 尺 × 20 尺）及灯光 3 组",
      "风扇 8 台",
      "桌子及桌布 15 套",
      "椅子及椅套 120 套",
      "使用庄严灵堂",
      "鲜花花坛",
      "遗照放大（12R）1 张",
      "精致相框 1 个",
      "雕柱鲜花",
      "使用佛歌机",
      "路向指示牌",
      "孝服 48 套",
      "唁慰录 1 本",
      "使用吊金箱 1 个",
      "使用追思屏风 1 个",
      "使用音响 1 套",
      "地方版华文报刊登讣告：1／4 版黑白，1 日",
      "专业治丧协调顾问",
      "专业丧务理事",
      "殡仪协调人员（08:30－20:30）",
      "守夜服务：2 位工作人员，20:30－06:00，共 2 晚",
      "佛教诵经服务",
      "治丧流程表",
      "入殓及安葬生肖相冲通告",
      "水果素菜祭品 3 天",
      "元宝蜡烛 1 套",
      "精致纸扎 1 套",
      "糖果红包 500 份",
      "饮用水 40 箱",
      "花生 50 包",
      "专业扶柩队 1 队",
      "寿内用品",
      "入殓鲜花",
      "大殓封棺",
      "司仪 1 人",
      "礼仪助理 2 人",
      "纪念品 200 份",
      "引导车 1 辆／单程",
      "使用进口豪华皇家灵车 1 辆／单程",
      "使用冷气巴士（40 座）1 辆／单程",
      "罗里载花圈 1 辆",
      "做七及百日提醒",
      "追思相册及优盘（120 张相片）1 份",
      "地方版华文报刊登感谢辞：1／4 版黑白，1 日"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 42888,
    "atNeed": 47888
  },
  {
    "id": "funeral-2-1",
    "name": "富贵自由｜基督教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "临终咨询：24小时临终礼仪咨询。",
      "遗体护理：申报死亡及领取死亡证书；遗体接送车1辆与接体人员；遗体净身、更衣及化妆；进口优质寿衣1套；遗体冰箱；十字被1件；富贵自由火化寿木1副。",
      "灵堂及治丧布置：风扇1台；桌子及桌布2套；椅子及椅套30套；庄严灵堂；灵桌花坛；遗照放大10R（1份）；精致相框1个；路向指示牌；孝服12件；吊唁簿1本；吊金箱1个；音响设备1套。",
      "治丧协调：专业治丧顾问及支援团队1组；殡仪协调人员1人；治丧流程表；蜡烛1套；十字架1个；糖果红包100份；饮用水5箱。",
      "入殓及出殡：专业扶柩队1组；入殓鲜花；入殓与封棺服务；进口豪华灵车1辆（单程）。",
      "后续关怀：做七及百日提醒；追思优盘1个。"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。仅限火化。",
    "preNeed": 9888,
    "atNeed": 11888
  },
  {
    "id": "funeral-2-2",
    "name": "富贵圆满｜基督教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "临终咨询：24小时临终礼仪咨询。",
      "遗体护理：申报死亡及领取死亡证书；遗体接送车1辆与接体人员；遗体净身、更衣及化妆；进口优质寿衣1套；遗体冰箱；十字被1件；豪华棺木或火化棺木1副；骨灰瓮1个（火化适用）。",
      "灵堂及治丧布置：殡仪馆2晚，或20×20尺特色灵棚及灯光1套；风扇2台；桌子及桌布4套；椅子及椅套50套；庄严灵堂；鲜花花坛；棺顶花1组；遗照放大10R（1份）；精致相框1个；蜡烛及十字架；路向指示牌；孝服24件；吊唁簿1本；吊金箱1个；追思屏风1组；音响设备1套。",
      "治丧协调：专业治丧协调顾问；殡仪协调人员（上午8:30至晚上8:30）；糖果红包200份；饮用水20箱；花生20包。",
      "入殓及出殡：专业扶柩队1组；入殓鲜花；入殓及封棺服务；纪念品50份；引导车1辆（单程）；进口豪华灵车1辆（单程）；40座冷气巴士1辆。",
      "后续关怀：做七及百日提醒；追思相册及优盘1套（相片80张）。"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 21888,
    "atNeed": 24888
  },
  {
    "id": "funeral-2-3",
    "name": "富贵尊荣｜基督教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "临终咨询：24小时临终礼仪咨询。",
      "遗体护理：申报死亡及领取死亡证书；遗体接送车1辆与接体人员；遗体净身、更衣及化妆；进口优质寿衣1套；遗体冰箱；十字被1件；豪华棺木或火化棺木1副；骨灰瓮1个（火化适用）。",
      "灵堂及治丧布置：殡仪馆使用，或20×20尺特色灵棚及灯光2套；风扇6台；桌子及桌布8套；椅子及椅套100套；庄严灵堂；鲜花花坛；棺顶花1组；遗照放大12R（1份）；精致相框1个；雕柱鲜花；蜡烛及十字架；路向指示牌；孝服48件；吊唁簿1本；吊金箱1个；追思屏风1组；音响设备1套。",
      "治丧协调：专业治丧协调顾问；专业丧务理事；殡仪协调人员（上午8:30至晚上8:30）；治丧流程表；糖果红包300份；饮用水30箱；花生40包。",
      "入殓及出殡：专业扶柩队1组；入殓鲜花；入殓及封棺服务；纪念品150份；引导车1辆（单程）；进口豪华灵车1辆（单程）；40座冷气巴士1辆；花圈运输1项。",
      "后续关怀：做七及百日提醒；追思相册及优盘1套（相片120张）。"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 33888,
    "atNeed": 38888
  },
  {
    "id": "funeral-2-4",
    "name": "富贵辉煌｜基督教殡仪",
    "category": 4,
    "visible": true,
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "临终咨询：24小时临终礼仪咨询。",
      "遗体护理：申报死亡及领取死亡证书；遗体接送车1辆与接体人员；遗体净身、更衣及化妆；进口优质寿衣1套；遗体冰箱；十字被1件；豪华棺木或火化棺木1副；骨灰瓮1个（火化适用）。",
      "灵堂及治丧布置：殡仪馆使用，或20×20尺特色灵棚及灯光3套；风扇10台；桌子及桌布15套；椅子及椅套120套；庄严灵堂；鲜花花坛；棺顶花1组；遗照放大12R（1份）；精致相框1个；雕柱鲜花；蜡烛及十字架；路向指示牌；孝服48件；吊唁簿1本；吊金箱1个；追思屏风1组；音响设备1套；本地华文报四分之一版黑白讣告刊登1日。",
      "治丧协调：专业治丧协调顾问；专业丧务理事；殡仪协调人员（上午8:30至晚上8:30）；夜间守夜服务2人、2晚（晚上8:30至次日上午6:00）；治丧流程表；糖果红包500份；饮用水40箱；花生50包。",
      "入殓及出殡：专业扶柩队1组；入殓鲜花；入殓及封棺服务；纪念品250份；引导车1辆（单程）；进口豪华灵车1辆（单程）；40座冷气巴士1辆；花圈运输1项。",
      "后续关怀：做七及百日提醒；追思相册及优盘1套（相片120张）；本地华文报四分之一版黑白谢辞刊登1日。"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。",
    "terms": "预购须至少提前3天购买。土葬／火化用品按实际安葬方式适用。",
    "preNeed": 40888,
    "atNeed": 45888
  },
  {
    "id": "juxian-1",
    "name": "聚仙楼 · 流金岁月单人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "single",
    "capacityCount": 1,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 19800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-2",
    "name": "聚仙楼 · 流金岁月双人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "double",
    "capacityCount": 2,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 31800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-3",
    "name": "聚仙楼 · 莲花观音单人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "single",
    "capacityCount": 1,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 17800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-4",
    "name": "聚仙楼 · 莲花观音双人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "double",
    "capacityCount": 2,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 29800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-5",
    "name": "聚仙楼 · 水月观音单人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "single",
    "capacityCount": 1,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 29800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-6",
    "name": "聚仙楼 · 水月观音双人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "double",
    "capacityCount": 2,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 47800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juxian-7",
    "name": "聚仙楼 · 水月观音四人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "four_plus",
    "capacityCount": 4,
    "placement": "indoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [],
    "offers": [
      {
        "name": "最低起价",
        "amount": 70800
      }
    ],
    "referencePrice": true,
    "priceNote": "以上价格未包含印花税。",
    "terms": "宣传参考起价待核实，正式上架前须确认现行实际总售价。"
  },
  {
    "id": "juya-1",
    "name": "聚雅阁 · 佛教三人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "triple",
    "placement": "outdoor",
    "religions": [
      {
        "id": "1",
        "name": "佛教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "骨灰位",
      "管理费",
      "火化费用",
      "骨灰瓮",
      "第二次安放相关费用"
    ],
    "offers": [
      {
        "name": "最低起价",
        "amount": 16888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "juya-2",
    "name": "聚雅阁 · 基督教双人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "double",
    "placement": "outdoor",
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "骨灰位",
      "管理费",
      "火化费用",
      "骨灰瓮",
      "第二次安放相关费用"
    ],
    "offers": [
      {
        "name": "最低起价",
        "amount": 11888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "juya-3",
    "name": "聚雅阁 · 基督教三人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "triple",
    "placement": "outdoor",
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "骨灰位",
      "管理费",
      "火化费用",
      "骨灰瓮",
      "第二次安放相关费用"
    ],
    "offers": [
      {
        "name": "最低起价",
        "amount": 16888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "tenghuang-double",
    "name": "腾黄阁 · 基督教双人骨灰位",
    "category": 3,
    "visible": true,
    "capacity": "double",
    "placement": "outdoor",
    "religions": [
      {
        "id": "2",
        "name": "基督教",
        "isPublished": true,
        "inclusions": [],
        "designs": []
      }
    ],
    "inclusions": [
      "双人骨灰位",
      "管理费",
      "火化费用 × 2次",
      "骨灰瓮 × 2个",
      "相关安装费用"
    ],
    "offers": [
      {
        "name": "最低起价",
        "amount": 12888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "fugui-tablet",
    "name": "富贵殿 · 神主灵位",
    "category": 5,
    "visible": true,
    "religions": [],
    "facing": "西北",
    "inclusions": [
      "神主灵位格位"
    ],
    "offers": [],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "dragon-turtle",
    "name": "龙龟生基园 · Zone DT",
    "category": 6,
    "visible": true,
    "religions": [],
    "area": 8,
    "inclusions": [
      "土地",
      "碑石",
      "管理费"
    ],
    "offers": [
      {
        "name": "产品售价",
        "amount": 19888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "pet-large",
    "name": "大型宠物墓地",
    "category": 7,
    "visible": true,
    "religions": [],
    "facing": "朝东",
    "area": 60,
    "inclusions": [
      "管理费",
      "设施费用",
      "墓穴设施",
      "宠物棺木"
    ],
    "offers": [
      {
        "name": "产品售价",
        "amount": 9800
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "pet-small",
    "name": "小型宠物墓地",
    "category": 7,
    "visible": true,
    "religions": [],
    "facing": "朝东",
    "area": 15,
    "inclusions": [
      "墓碑",
      "管理费",
      "设施费用",
      "墓穴设施",
      "宠物棺木"
    ],
    "offers": [
      {
        "name": "产品售价",
        "amount": 8888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  },
  {
    "id": "pet-urn",
    "name": "宠物骨灰墓地",
    "category": 7,
    "visible": true,
    "religions": [],
    "facing": "朝东",
    "area": 6,
    "inclusions": [
      "墓碑",
      "管理费",
      "设施费用",
      "骨灰安葬设施",
      "骨灰瓮",
      "火化费用"
    ],
    "offers": [
      {
        "name": "产品售价",
        "amount": 3888
      }
    ],
    "priceNote": "以上价格未包含印花税。"
  }
];
