import source from '../../supabase/fixtures/real-product-structures.json' with {type:'json'};
const sample = source.products.find(p => p.key === 'funeral-1-2');
// Explicit fixture group assignments test backend grouping; these are not product claims.
export const record = {id:'review-funeral',slug:'review-funeral',name:sample.name,category_id:4,
 religions:[{id:1,name:'佛教'}],attributes:{duration_days:sample.duration_days,duration_nights:sample.duration_nights,funeral_method:sample.funeral_method,service_venue:'丧府/殡仪礼堂'},
 prices:['pre_need','at_need'].map(price_type=>({offer_id:'review',offer_name:'默认方案',price_type,amount:sample.prices[0][price_type],price_note:price_type==='pre_need'?'预购须至少提前3天购买。\n以上价格未包含印花税':'以上价格未包含印花税'})),
 inclusions:sample.inclusions.map((name,i)=>({name,group_title:i<15?'测试分组一':i<30?'测试分组二':'测试分组三'}))};
