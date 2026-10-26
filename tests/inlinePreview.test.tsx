import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import CatalogImage from '../src/catalog/PublicImage';
import {PublicCatalogContext} from '../src/catalog/publicContext';
import {inlinePreview} from '../shared/inlinePreview';
import {changesFor} from '../apps/admin/src/model';

test('authorized product data paints a colour preview before any image request resolves',async()=>{
 const data=await sharp({create:{width:160,height:120,channels:3,background:'#cc3344'}}).webp().toBuffer();
 const preview=`data:image/webp;base64,${data.toString('base64')}`;
 const html=renderToStaticMarkup(<PublicCatalogContext.Provider value={{config:{url:'https://example.supabase.co',key:'sb_publishable_test'},status:'ready',products:[],retry:()=>{}}}>
  <CatalogImage image={{id:'photo',bucket:'catalog-media-private',path:'product/photo.png',preview_placeholder:preview}}/>
 </PublicCatalogContext.Provider>);
 assert.match(html,/data-image-quality="preview"/);
 assert(html.includes(preview));
 assert.equal(inlinePreview('data:image/svg+xml;base64,AAAA'),undefined);
 assert.equal(inlinePreview('https://untrusted.invalid/photo.webp'),undefined);
 assert.equal(inlinePreview('data:image/webp;base64,'+'A'.repeat(65536)),undefined);
 const before:any={product:{id:'p',category_id:1,publication_status:'draft'},product_images:[{id:'photo',product_id:'p',alt_text:'before'}]};
 const after=structuredClone(before);after.product_images[0].preview_placeholder=preview;after.product_images[0].alt_text='after';
 const changes=changesFor(before,after,'draft');
 assert.equal(changes.p_changes.product_images.upsert?.[0].alt_text,'after');
 assert.equal(changes.p_changes.product_images.upsert?.[0].preview_placeholder,undefined);
});
