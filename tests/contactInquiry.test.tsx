import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callbackPhonePattern, contactInquiryMessage, type ContactInquiry } from '../src/data/contactInquiry';
const blank: ContactInquiry = { name:'',service:'',message:'',callback:false,phone:'' };
test('blank optional fields produce default inquiry',()=>{
 assert.equal(contactInquiryMessage({...blank,name:'  ',message:'\n'}),'您好，我想咨询富贵山庄或云南善堂的相关服务。');
});
test('message only and service only do not require identity fields',()=>{
 const message=contactInquiryMessage({...blank,message:'想了解预算'});
 assert.match(message,/咨询内容：想了解预算/); assert.doesNotMatch(message,/称呼：|咨询方向：|联系电话：/);
 assert.match(contactInquiryMessage({...blank,service:'骨灰位'}),/咨询方向：骨灰位/);
});
test('unicode symbols and multiline content survive URL encoding',()=>{
 const message=contactInquiryMessage({...blank,name:' 陈女士 ',service:'殡仪服务',message:'佛教 & 基督教？\n预算 + 安排 #1'});
 assert.equal(new URLSearchParams(new URL(`https://wa.me/60198186134?text=${encodeURIComponent(message)}`).search).get('text'),message);
 assert.match(message,/称呼：陈女士/); assert.match(message,/咨询内容：佛教 & 基督教？\n预算 \+ 安排 #1/);
});
test('callback preference alone controls whether phone appears',()=>{
 assert.doesNotMatch(contactInquiryMessage({...blank,phone:'0198186134'}),/联系电话/);
 const message=contactInquiryMessage({...blank,callback:true,phone:'0198186134'});
 assert.match(message,/回电意愿：希望顾问电话联系我/); assert.match(message,/联系电话：0198186134/);
});

test('callback pattern follows modern HTML Unicode validation and requires actual digits',()=>{
 const pattern=new RegExp(`^(?:${callbackPhonePattern})$`,'v');
 for(const value of ['-------','abc1234','123456','1234567890123456']) assert.equal(pattern.test(value),false);
 for(const value of ['0198186134','+60 19-818 6134','(016) 776-0560']) assert.equal(pattern.test(value),true);
});
